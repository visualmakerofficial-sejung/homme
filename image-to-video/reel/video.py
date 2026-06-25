"""ffmpeg 로 장면을 합성하고 전체 릴스를 만든다.

장면 1개 = 배경 PNG + (선택)캐릭터 PNG + 자막 PNG 를 겹쳐서,
켄번스 줌(배경) + 둥실 애니메이션(캐릭터) + 자막 페이드인 으로 mp4 생성.
이후 모든 장면을 전환(크로스페이드/하드컷)으로 이어붙이고 오디오를 입힌다.
"""

from __future__ import annotations

import os

from . import ffutil


def _char_y_expr(y_center: float, anim: str) -> str:
    """캐릭터 overlay y 식. y_center 는 화면 높이 대비 캐릭터 중심 위치."""
    base = f"(H*{y_center:.4f}-h/2)"
    if anim == "bob":      # 위아래 둥실
        return f"'{base}+22*sin(2*PI*t/1.6)'"
    if anim == "float":    # 살짝 떠있는 느낌(느리게)
        return f"'{base}+12*sin(2*PI*t/3.0)'"
    return f"'{base}'"      # none


def _char_x_expr(anim: str) -> str:
    if anim == "float":    # 좌우로 미세하게
        return "'(W-w)/2+18*sin(2*PI*t/4.0)'"
    return "'(W-w)/2'"


def build_scene(idx: int, duration: float, fps: int, size: tuple[int, int],
                bg_png: str, char_png: str | None, cap_png: str | None,
                anim: str, char_y: float, out_path: str) -> None:
    """장면 1개를 mp4(무음)로 렌더링한다."""
    w, h = size
    frames = max(1, int(round(duration * fps)))

    inputs: list[str] = ["-loop", "1", "-t", f"{duration}", "-i", bg_png]
    # 배경: cover scale + 천천히 줌인(켄번스)
    filt = (
        f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},"
        f"zoompan=z='min(zoom+0.0007,1.12)':d={frames}:s={w}x{h}:fps={fps},"
        f"setsar=1[bg];"
    )
    last = "bg"
    next_in = 1

    if char_png:
        inputs += ["-loop", "1", "-t", f"{duration}", "-i", char_png]
        x_expr = _char_x_expr(anim)
        y_expr = _char_y_expr(char_y, anim)
        filt += (
            f"[{next_in}:v]format=rgba[ch];"
            f"[{last}][ch]overlay=x={x_expr}:y={y_expr}:eval=frame[v{next_in}];"
        )
        last = f"v{next_in}"
        next_in += 1

    if cap_png:
        inputs += ["-loop", "1", "-t", f"{duration}", "-i", cap_png]
        filt += (
            f"[{next_in}:v]format=rgba,fade=t=in:st=0:d=0.35:alpha=1[cap];"
            f"[{last}][cap]overlay=0:0[v{next_in}];"
        )
        last = f"v{next_in}"
        next_in += 1

    filt += f"[{last}]format=yuv420p[vout]"

    cmd = ["ffmpeg", "-y", *inputs,
           "-filter_complex", filt,
           "-map", "[vout]",
           "-r", str(fps), "-t", f"{duration}",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p",
           out_path]
    ffutil.run(cmd)


def concat_scenes(scene_files: list[str], fps: int, size: tuple[int, int],
                  transition: str, trans_dur: float, out_path: str) -> None:
    """장면 mp4 들을 이어붙인다."""
    if len(scene_files) == 1:
        # 단일 장면이면 그대로 복사
        ffutil.run(["ffmpeg", "-y", "-i", scene_files[0], "-c", "copy", out_path])
        return

    if transition == "cut":
        _concat_demuxer(scene_files, out_path)
        return

    # 크로스페이드(xfade) 체인
    durs = [ffutil.probe_duration(f) for f in scene_files]
    inputs: list[str] = []
    for f in scene_files:
        inputs += ["-i", f]

    filt = ""
    prev = "0:v"
    offset = 0.0
    for i in range(1, len(scene_files)):
        offset += durs[i - 1] - trans_dur
        out_label = f"x{i}"
        filt += (
            f"[{prev}][{i}:v]xfade=transition=fade:duration={trans_dur}:"
            f"offset={offset:.3f}[{out_label}];"
        )
        prev = out_label
    filt = filt.rstrip(";")

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filt,
           "-map", f"[{prev}]", "-r", str(fps),
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", out_path]
    ffutil.run(cmd)


def _concat_demuxer(files: list[str], out_path: str) -> None:
    list_path = out_path + ".concat.txt"
    with open(list_path, "w", encoding="utf-8") as f:
        for p in files:
            f.write(f"file '{os.path.abspath(p)}'\n")
    ffutil.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", list_path, "-c", "copy", out_path])
    os.remove(list_path)


def mux_audio(video_path: str, out_path: str, music: str | None,
              music_volume: float, narration: str | None,
              narration_volume: float) -> None:
    """영상에 배경음악/내레이션을 입힌다. 둘 다 없으면 그대로 복사."""
    if not music and not narration:
        ffutil.run(["ffmpeg", "-y", "-i", video_path, "-c", "copy", out_path])
        return

    total = ffutil.probe_duration(video_path)
    _mux_complex(video_path, out_path, music, music_volume,
                 narration, narration_volume, total)


def _mux_complex(video_path: str, out_path: str, music: str | None,
                 music_volume: float, narration: str | None,
                 narration_volume: float, total: float) -> None:
    """음악(+선택 내레이션)을 한 번에 믹스한다."""
    inputs: list[str] = ["-i", video_path]          # 0: video
    idx = 1
    filt_parts: list[str] = []
    mix_labels: list[str] = []

    if narration:
        inputs += ["-i", narration]                 # idx: narration
        filt_parts.append(
            f"[{idx}:a]volume={narration_volume},apad,atrim=0:{total:.3f}[narr]"
        )
        mix_labels.append("[narr]")
        idx += 1

    if music:
        inputs += ["-stream_loop", "-1", "-i", music]  # idx: music(loop)
        filt_parts.append(
            f"[{idx}:a]volume={music_volume},atrim=0:{total:.3f},"
            f"afade=t=out:st={max(0.0, total-1.0):.3f}:d=1.0[music]"
        )
        mix_labels.append("[music]")
        idx += 1

    if len(mix_labels) == 1:
        filt = ";".join(filt_parts) + f";{mix_labels[0]}anull[aout]"
    else:
        filt = (";".join(filt_parts) + ";" + "".join(mix_labels) +
                f"amix=inputs={len(mix_labels)}:duration=first:"
                f"dropout_transition=0:normalize=0[aout]")

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filt,
           "-map", "0:v", "-map", "[aout]",
           "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
           "-shortest", out_path]
    ffutil.run(cmd)
