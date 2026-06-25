"""설정 → 9:16 MP4 릴스 생성 파이프라인."""

from __future__ import annotations

import os
import tempfile

from . import audio, ffutil, render, tts, video
from .config import ReelConfig
from .fonts import find_korean_font


def build_reel(cfg: ReelConfig, out_path: str, verbose: bool = True) -> str:
    """ReelConfig 를 받아 out_path 에 MP4 를 생성하고 경로를 반환한다."""
    ffutil.ensure_ffmpeg()
    font_path = find_korean_font(cfg.font)
    size = (cfg.width, cfg.height)

    if verbose:
        print(f"▶ '{cfg.title}' 릴스 생성 시작  ({cfg.width}x{cfg.height}, {cfg.fps}fps)")
        print(f"  폰트: {font_path}")
        print(f"  장면 수: {len(cfg.scenes)}")

    workdir = tempfile.mkdtemp(prefix="reel_")

    # 1) TTS 합성 + 장면 길이 보정 ------------------------------------------
    tts_files: list[str | None] = [None] * len(cfg.scenes)
    durations: list[float] = [s.duration for s in cfg.scenes]

    if cfg.tts:
        if not tts.is_available():
            print("  [경고] gTTS 미설치 — TTS 를 건너뜁니다. (pip install gTTS)")
        else:
            for i, scene in enumerate(cfg.scenes):
                mp3 = os.path.join(workdir, f"tts_{i}.mp3")
                if tts.synthesize(scene.text, mp3, cfg.tts_lang):
                    tts_files[i] = mp3
                    dur = ffutil.probe_duration(mp3)
                    # 음성 길이 + 여유(0.7s) 와 설정 길이 중 큰 값
                    durations[i] = max(scene.duration, dur + 0.7)
                    if verbose:
                        print(f"  장면 {i+1}: TTS {dur:.1f}s → 길이 {durations[i]:.1f}s")

    # 2) 장면별 레이어 렌더링 + mp4 생성 ------------------------------------
    scene_files: list[str] = []
    for i, scene in enumerate(cfg.scenes):
        bg_spec = scene.background or cfg.background
        bg_img = render.make_background(bg_spec, size)
        bg_png = os.path.join(workdir, f"bg_{i}.png")
        bg_img.save(bg_png)

        char_path = scene.character or cfg.character.image
        char_png: str | None = None
        if char_path:
            char_img = render.prepare_character(
                char_path, cfg.width, cfg.character.scale, cfg.character.shadow)
            char_png = os.path.join(workdir, f"char_{i}.png")
            char_img.save(char_png)

        cap_png: str | None = None
        if scene.text.strip():
            cap_img = render.render_caption(
                scene.text, size, font_path, cfg.caption, scene.emphasis)
            cap_png = os.path.join(workdir, f"cap_{i}.png")
            cap_img.save(cap_png)

        scene_mp4 = os.path.join(workdir, f"scene_{i}.mp4")
        video.build_scene(
            i, durations[i], cfg.fps, size, bg_png, char_png, cap_png,
            cfg.character.anim, cfg.character.y, scene_mp4)
        scene_files.append(scene_mp4)
        if verbose:
            print(f"  장면 {i+1}/{len(cfg.scenes)} 렌더 완료 ({durations[i]:.1f}s)")

    # 3) 장면 이어붙이기 -----------------------------------------------------
    silent_mp4 = os.path.join(workdir, "silent.mp4")
    video.concat_scenes(scene_files, cfg.fps, size, cfg.transition,
                        cfg.transition_dur, silent_mp4)
    total = ffutil.probe_duration(silent_mp4)
    if verbose:
        print(f"  합치기 완료 — 총 길이 {total:.1f}s ({cfg.transition})")

    # 4) 내레이션 트랙 구성 (TTS or 직접 녹음) -------------------------------
    narration_path: str | None = cfg.narration
    if cfg.tts and any(tts_files):
        # 전환 방식에 따른 각 장면 시작 시각 계산
        starts: list[float] = []
        acc = 0.0
        for i in range(len(cfg.scenes)):
            if cfg.transition == "fade":
                starts.append(max(0.0, acc - i * cfg.transition_dur))
            else:
                starts.append(acc)
            acc += durations[i]
        narr = os.path.join(workdir, "narration.wav")
        if audio.build_narration(tts_files, starts, total, narr):
            narration_path = narr

    # 5) 오디오 믹스 (배경음악 + 내레이션) ----------------------------------
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    video.mux_audio(silent_mp4, out_path, cfg.music, cfg.music_volume,
                    narration_path, cfg.tts_volume)

    if verbose:
        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"✔ 완료: {out_path}  ({size_mb:.1f} MB, {total:.1f}s)")
    return out_path
