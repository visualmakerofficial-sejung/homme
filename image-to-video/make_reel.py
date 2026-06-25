#!/usr/bin/env python3
"""이미지를 영상으로 만들기 — 인스타그램 릴스(9:16) MP4 생성기.

사용법:
  1) 설정 파일로 생성
     python make_reel.py --config examples/sosik_sample.json -o output/sosik.mp4

  2) 빠른 단일 이미지 + 자막 모드 (설정 파일 없이)
     python make_reel.py --image assets/sosik.png \\
         --text "첫 장면 자막" --text "두 번째 장면" -o output/quick.mp4

옵션은 --help 참고.
"""

from __future__ import annotations

import argparse
import sys

from reel.builder import build_reel
from reel.config import ReelConfig, Scene, load_config


def _quick_config(args) -> ReelConfig:
    """--config 없이 CLI 인자만으로 간단한 릴스 설정을 만든다."""
    cfg = ReelConfig(title=args.title or "quick")
    cfg.character.image = args.image
    if args.music:
        cfg.music = args.music
    cfg.tts = args.tts
    texts = args.text or ["내용을 입력하세요"]
    cfg.scenes = [Scene(text=t, duration=args.duration) for t in texts]
    return cfg


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="캐릭터 이미지 + 내용 → 인스타 릴스용 9:16 MP4 생성")
    p.add_argument("--config", "-c", help="릴스 설정 JSON 경로")
    p.add_argument("--out", "-o", default="output/reel.mp4", help="출력 MP4 경로")

    # 빠른 모드용 인자
    p.add_argument("--image", "-i", help="캐릭터 이미지(PNG) 경로 (빠른 모드)")
    p.add_argument("--text", "-t", action="append",
                   help="장면 자막. 여러 번 쓰면 장면이 늘어남 (빠른 모드)")
    p.add_argument("--duration", "-d", type=float, default=3.0,
                   help="빠른 모드 장면당 길이(초). 기본 3.0")
    p.add_argument("--title", help="릴스 제목(파일 내부용)")
    p.add_argument("--music", "-m", help="배경음악 파일 경로")
    p.add_argument("--tts", action="store_true",
                   help="한국어 TTS 내레이션 자동 생성 (인터넷 필요)")
    p.add_argument("--quiet", "-q", action="store_true", help="로그 최소화")

    args = p.parse_args(argv)

    if args.config:
        cfg = load_config(args.config)
        if args.music:
            cfg.music = args.music
        if args.tts:
            cfg.tts = True
    elif args.image or args.text:
        cfg = _quick_config(args)
    else:
        p.error("--config 또는 --image/--text 중 하나는 필요합니다.")
        return 2

    try:
        build_reel(cfg, args.out, verbose=not args.quiet)
    except Exception as exc:
        print(f"오류: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
