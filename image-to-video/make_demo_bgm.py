#!/usr/bin/env python3
"""데모용 배경음악(합성 톤) 생성기 — 저작권 걱정 없는 사인파 코드 패드.

실제 영상에는 본인이 보유한/라이선스가 있는 음악을 쓰세요.
사용: python make_demo_bgm.py assets/demo_bgm.m4a [길이초]
"""

import subprocess
import sys

# 부드러운 코드(주파수, Hz) — C, E, G, C
FREQS = [261.63, 329.63, 392.00, 523.25]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "assets/demo_bgm.m4a"
    dur = float(sys.argv[2]) if len(sys.argv) > 2 else 20.0

    sources = []
    filters = []
    for i, f in enumerate(FREQS):
        sources += ["-f", "lavfi", "-t", str(dur),
                    "-i", f"sine=frequency={f}:sample_rate=44100"]
        filters.append(f"[{i}:a]volume=0.18[s{i}]")
    mix_inputs = "".join(f"[s{i}]" for i in range(len(FREQS)))
    filt = (";".join(filters) + ";" + mix_inputs +
            f"amix=inputs={len(FREQS)}:normalize=0,"
            f"afade=t=in:st=0:d=2,afade=t=out:st={dur-2}:d=2,"
            f"volume=0.9[out]")

    cmd = ["ffmpeg", "-y", *sources, "-filter_complex", filt,
           "-map", "[out]", "-c:a", "aac", "-b:a", "160k", out]
    subprocess.run(cmd, check=True)
    print(f"생성: {out} ({dur:.0f}s)")


if __name__ == "__main__":
    main()
