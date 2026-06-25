"""장면별 TTS 음성을 타임라인에 배치해 하나의 내레이션 트랙으로 만든다."""

from __future__ import annotations

from . import ffutil


def build_narration(tts_files: list[str | None], starts: list[float],
                    total: float, out_path: str) -> bool:
    """각 장면의 TTS(mp3)를 해당 장면 시작 시각(starts[i])에 배치해 믹스한다.

    tts_files[i] 가 None 이면 그 장면은 건너뛴다.
    하나도 없으면 False 를 반환(내레이션 없음).
    """
    present = [(f, s) for f, s in zip(tts_files, starts) if f]
    if not present:
        return False

    inputs: list[str] = []
    for f, _ in present:
        inputs += ["-i", f]

    filt_parts: list[str] = []
    labels: list[str] = []
    for i, (_, start) in enumerate(present):
        delay_ms = int(max(0.0, start) * 1000)
        filt_parts.append(f"[{i}:a]adelay={delay_ms}|{delay_ms}[a{i}]")
        labels.append(f"[a{i}]")

    if len(labels) == 1:
        filt = filt_parts[0] + f";{labels[0]}atrim=0:{total:.3f}[out]"
    else:
        filt = (";".join(filt_parts) + ";" + "".join(labels) +
                f"amix=inputs={len(labels)}:duration=longest:"
                f"dropout_transition=0:normalize=0,atrim=0:{total:.3f}[out]")

    ffutil.run(["ffmpeg", "-y", *inputs, "-filter_complex", filt,
                "-map", "[out]", "-ar", "44100", "-ac", "2", out_path])
    return True
