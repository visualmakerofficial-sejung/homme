"""ffmpeg / ffprobe 공통 유틸리티."""

from __future__ import annotations

import json
import shutil
import subprocess


def ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise RuntimeError(
            "ffmpeg/ffprobe 가 필요합니다. 'apt-get install ffmpeg' 로 설치하세요."
        )


def run(cmd: list[str]) -> None:
    """ffmpeg 명령 실행. 실패 시 stderr 를 담아 예외를 던진다."""
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            "ffmpeg 실패:\n명령: " + " ".join(cmd) + "\n\n" + proc.stderr[-3000:]
        )


def probe_duration(path: str) -> float:
    """오디오/비디오 길이(초)를 반환."""
    out = subprocess.check_output(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", path],
        text=True,
    )
    return float(json.loads(out)["format"]["duration"])
