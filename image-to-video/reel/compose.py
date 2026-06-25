"""AI가 생성한 장면 클립들을 받아 최종 9:16 광고 릴스로 합성한다.

각 클립을:
  1) 9:16(1080x1920)로 스케일+센터크롭 정규화, fps 통일
  2) 언어(KO/EN)에 맞는 자막을 번인(페이드인)
한 뒤, 장면들을 이어붙이고(크로스페이드/하드컷) 음성·음악을 입힌다.

음성 옵션:
  - tts : 장면별 내레이션을 TTS 로 만들어 타임라인에 배치 + 배경음악
  - clip: AI 클립의 원래 오디오(예: Seedance 네이티브 음성)를 유지
  - none: 음악만(또는 무음)
"""

from __future__ import annotations

import os
import tempfile

from . import audio, ffutil, render, tts, video
from .brief import AdBrief, AdScene
from .config import Caption
from .fonts import find_korean_font


def _normalize_clip(src: str, size: tuple[int, int], fps: int,
                    duration: float | None, out: str) -> None:
    """클립을 9:16 로 스케일+센터크롭, fps 통일. duration 지정 시 트림/패딩."""
    w, h = size
    vf = (f"scale={w}:{h}:force_original_aspect_ratio=increase,"
          f"crop={w}:{h},fps={fps},setsar=1,format=yuv420p")
    cmd = ["ffmpeg", "-y", "-i", src, "-vf", vf,
           "-an",  # 오디오는 뒤에서 따로 처리
           "-c:v", "libx264", "-preset", "medium", "-crf", "20"]
    if duration:
        cmd += ["-t", f"{duration}"]
    cmd += [out]
    ffutil.run(cmd)


def _burn_caption(clip: str, cap_png: str | None, out: str) -> None:
    """전체화면 자막 PNG 를 클립 위에 페이드인 오버레이."""
    if not cap_png:
        ffutil.run(["ffmpeg", "-y", "-i", clip, "-c", "copy", out])
        return
    # 자막 PNG 는 -loop 1 로 클립 내내 프레임을 만들어야 alpha 페이드가 동작한다.
    # overlay shortest=1 로 출력 길이를 클립에 맞춘다.
    cmd = ["ffmpeg", "-y", "-i", clip, "-loop", "1", "-i", cap_png,
           "-filter_complex",
           "[1:v]format=rgba,fade=t=in:st=0:d=0.35:alpha=1[cap];"
           "[0:v][cap]overlay=0:0:shortest=1[v]",
           "-map", "[v]", "-c:v", "libx264", "-preset", "medium",
           "-crf", "20", "-pix_fmt", "yuv420p", out]
    ffutil.run(cmd)


def _extract_clip_audio(clips: list[str], size_total: float,
                        starts: list[float], durations: list[float],
                        workdir: str, out: str) -> bool:
    """각 클립의 원음을 잘라서 타임라인에 배치(클립에 오디오가 있을 때)."""
    seg_files: list[str | None] = []
    for i, clip in enumerate(clips):
        has_audio = False
        try:
            import subprocess
            r = subprocess.run(
                ["ffprobe", "-v", "quiet", "-select_streams", "a",
                 "-show_entries", "stream=index", "-of", "csv=p=0", clip],
                capture_output=True, text=True)
            has_audio = bool(r.stdout.strip())
        except Exception:
            has_audio = False
        if not has_audio:
            seg_files.append(None)
            continue
        seg = os.path.join(workdir, f"clipaud_{i}.m4a")
        ffutil.run(["ffmpeg", "-y", "-i", clip, "-t", f"{durations[i]}",
                    "-vn", "-c:a", "aac", "-b:a", "192k", seg])
        seg_files.append(seg)
    return audio.build_narration(seg_files, starts, size_total, out)


def build_ad_reel(brief: AdBrief, clips: list[str], out_path: str,
                  verbose: bool = True) -> str:
    """브리프 + 장면 클립 목록 → 최종 광고 릴스 MP4."""
    ffutil.ensure_ffmpeg()
    if len(clips) != len(brief.scenes):
        raise ValueError(
            f"클립 수({len(clips)})와 장면 수({len(brief.scenes)})가 다릅니다.")

    font_path = find_korean_font()
    size = (brief.width, brief.height)
    fps = brief.fps
    workdir = tempfile.mkdtemp(prefix="adreel_")

    # 자막 스타일(레퍼런스처럼 하단 자막)
    cap_style = Caption(position=0.82, font_size=72, stroke_width=9,
                        box=True, box_color="#000000B0", max_chars_per_line=16)

    if verbose:
        print(f"▶ '{brief.title}' 광고 릴스 합성  ({brief.width}x{brief.height}, "
              f"{fps}fps, 언어={brief.language})")

    # 1) 정규화 + 자막 번인 -------------------------------------------------
    scene_files: list[str] = []
    durations: list[float] = []
    for i, (clip, scene) in enumerate(zip(clips, brief.scenes)):
        durations.append(scene.duration)
        norm = os.path.join(workdir, f"norm_{i}.mp4")
        _normalize_clip(clip, size, fps, scene.duration, norm)

        cap_png = None
        text = brief.caption_text(scene)
        if text.strip():
            cap_img = render.render_caption(text, size, font_path, cap_style)
            cap_png = os.path.join(workdir, f"cap_{i}.png")
            cap_img.save(cap_png)

        scene_mp4 = os.path.join(workdir, f"scene_{i}.mp4")
        _burn_caption(norm, cap_png, scene_mp4)
        scene_files.append(scene_mp4)
        if verbose:
            print(f"  장면 {i+1}/{len(clips)} ({scene.beat}) 정규화+자막 완료")

    # 2) 이어붙이기 ---------------------------------------------------------
    silent = os.path.join(workdir, "silent.mp4")
    video.concat_scenes(scene_files, fps, size, brief.transition,
                        brief.transition_dur, silent)
    total = ffutil.probe_duration(silent)

    # 장면 시작 시각(전환 겹침 반영)
    starts: list[float] = []
    acc = 0.0
    for i in range(len(brief.scenes)):
        starts.append(max(0.0, acc - i * brief.transition_dur)
                      if brief.transition == "fade" else acc)
        acc += durations[i]

    # 3) 음성 트랙 ----------------------------------------------------------
    narration_path: str | None = None
    if brief.voice_mode == "tts" and tts.is_available():
        lang = brief.lang_for_voice()
        tts_files: list[str | None] = []
        for i, scene in enumerate(brief.scenes):
            text = brief.narration_text(scene) or brief.caption_text(scene)
            if not text.strip():
                tts_files.append(None)
                continue
            mp3 = os.path.join(workdir, f"tts_{i}.mp3")
            tts_files.append(mp3 if tts.synthesize(text, mp3, lang) else None)
        narr = os.path.join(workdir, "narration.wav")
        if audio.build_narration(tts_files, starts, total, narr):
            narration_path = narr
    elif brief.voice_mode == "tts" and not tts.is_available():
        print("  [경고] gTTS 미설치 — 음성 없이 진행 (pip install gTTS)")
    elif brief.voice_mode == "clip":
        narr = os.path.join(workdir, "clipaudio.wav")
        if _extract_clip_audio(clips, total, starts, durations, workdir, narr):
            narration_path = narr

    # 4) 믹스(음성 + 음악) --------------------------------------------------
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    video.mux_audio(silent, out_path, brief.music, brief.music_volume,
                    narration_path, brief.voice_volume)

    if verbose:
        mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"✔ 완료: {out_path}  ({mb:.1f} MB, {total:.1f}s)")
    return out_path
