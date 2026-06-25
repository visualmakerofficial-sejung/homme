"""한국어 폰트 탐색 유틸리티.

시스템에 설치된 나눔/노토 계열 폰트를 우선 찾고, 없으면 사용자가
지정한 폰트 경로를 사용한다.
"""

from __future__ import annotations

import os
import subprocess

# 선호 폰트 후보 (굵은 글씨 우선 — 릴스 자막은 두꺼울수록 가독성이 좋다)
_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumSquareRoundEB.ttf",
    "/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothicExtraBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothicBold.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
]


def find_korean_font(preferred: str | None = None) -> str:
    """사용 가능한 한국어 폰트 파일 경로를 반환한다.

    preferred 가 주어지고 실제로 존재하면 그것을 그대로 쓴다.
    """
    if preferred and os.path.exists(preferred):
        return preferred

    for path in _CANDIDATES:
        if os.path.exists(path):
            return path

    # fc-match 로 한 번 더 시도
    try:
        out = subprocess.check_output(
            ["fc-match", "-f", "%{file}", "Nanum:bold"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if out and os.path.exists(out):
            return out
    except Exception:
        pass

    raise FileNotFoundError(
        "한국어 폰트를 찾지 못했습니다. 'apt-get install fonts-nanum' 으로 설치하거나 "
        "설정에서 font 경로를 직접 지정하세요."
    )
