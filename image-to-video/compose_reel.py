#!/usr/bin/env python3
"""AI 클립 + 브리프 → 최종 9:16 광고 릴스(자막·음성 합성).

Higgsfield 로 만든 장면 클립들을 순서대로 넘기면, 브리프의 자막/언어/음성
설정에 맞춰 하나의 릴스로 합쳐 준다.

사용법:
  python compose_reel.py --brief briefs/hairbrush_ko.json \\
      --clips work/s1.mp4 work/s2.mp4 work/s3.mp4 work/s4.mp4 \\
      --lang ko -o output/hairbrush.mp4

  # 클립 폴더의 정렬된 mp4 를 자동 사용
  python compose_reel.py --brief briefs/hairbrush_ko.json \\
      --clips-dir work/clips --lang en -o output/hairbrush_en.mp4
"""

from __future__ import annotations

import argparse
import glob
import os
import sys

from reel.brief import load_brief
from reel.compose import build_ad_reel


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="AI 클립 + 브리프 → 9:16 광고 릴스")
    p.add_argument("--brief", "-b", required=True, help="광고 브리프 JSON")
    p.add_argument("--clips", "-c", nargs="*", help="장면 클립 경로(장면 순서대로)")
    p.add_argument("--clips-dir", help="클립이 든 폴더(이름순 정렬해 사용)")
    p.add_argument("--lang", "-l", choices=["ko", "en"],
                   help="이 영상의 언어(브리프 기본값을 덮어씀)")
    p.add_argument("--voice", choices=["tts", "clip", "none"],
                   help="음성 모드 덮어쓰기")
    p.add_argument("--music", "-m", help="배경음악 경로 덮어쓰기")
    p.add_argument("--out", "-o", default="output/ad_reel.mp4")
    p.add_argument("--quiet", "-q", action="store_true")
    args = p.parse_args(argv)

    brief = load_brief(args.brief)
    if args.lang:
        brief.language = args.lang
    if args.voice:
        brief.voice_mode = args.voice
    if args.music:
        brief.music = args.music

    clips = list(args.clips or [])
    if args.clips_dir:
        for ext in ("*.mp4", "*.mov", "*.webm"):
            clips += sorted(glob.glob(os.path.join(args.clips_dir, ext)))
    if not clips:
        p.error("--clips 또는 --clips-dir 로 장면 클립을 지정하세요.")
        return 2

    try:
        build_ad_reel(brief, clips, args.out, verbose=not args.quiet)
    except Exception as exc:
        print(f"오류: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
