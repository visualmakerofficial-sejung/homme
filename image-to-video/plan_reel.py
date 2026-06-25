#!/usr/bin/env python3
"""브리프 → Higgsfield 생성 '레시피' 출력.

크레딧을 쓰기 전에, 어떤 이미지/영상 생성을 어떤 레퍼런스(캐릭터·제품)로
돌릴지 사람이 검토할 수 있게 단계별 계획을 보여 준다. (실제 생성은
Higgsfield MCP 가 수행)

사용법:
  python plan_reel.py --brief briefs/hairbrush_ko.json
  python plan_reel.py --brief briefs/hairbrush_ko.json --json  # 기계 판독용
"""

from __future__ import annotations

import argparse
import json

from reel.brief import AdBrief, load_brief


def build_plan(brief: AdBrief) -> dict:
    """브리프를 생성 단계 목록으로 변환."""
    steps: list[dict] = []
    char = brief.character
    prod = brief.product

    for i, scene in enumerate(brief.scenes):
        refs = []
        if char.image:
            refs.append({"role": "image", "asset": "character",
                         "path": char.image})
        if scene.use_product and prod.image:
            refs.append({"role": "image", "asset": "product",
                         "path": prod.image})

        style = brief.style
        prompt = scene.image_prompt
        if char.description:
            prompt = f"{char.description}. {prompt}"
        if scene.use_product and prod.description:
            prompt = f"{prompt} The product is {prod.description}."

        steps.append({
            "scene": i + 1,
            "beat": scene.beat,
            "duration": scene.duration,
            "video_model": brief.video_model,
            "image_model": brief.image_model,
            "resolution": brief.resolution,
            "aspect_ratio": brief.aspect,
            "references": refs,
            "image_prompt": f"{prompt}. Style: {style}",
            "motion_prompt": scene.motion_prompt,
            "caption": brief.caption_text(scene),
            "narration": brief.narration_text(scene),
        })

    return {
        "title": brief.title,
        "language": brief.language,
        "character": {"name": char.name, "image": char.image,
                      "description": char.description},
        "product": {"name": prod.name, "image": prod.image,
                    "description": prod.description},
        "scenes": len(brief.scenes),
        "steps": steps,
    }


def print_plan(plan: dict) -> None:
    print(f"\n=== 제작 레시피: {plan['title']}  (언어: {plan['language']}) ===")
    print(f"캐릭터: {plan['character']['name']}  "
          f"[{'이미지 있음' if plan['character']['image'] else '설명만'}]")
    print(f"제품:   {plan['product']['name']}  "
          f"[{'이미지 있음' if plan['product']['image'] else '설명만'}]")
    print(f"장면 수: {plan['scenes']}\n")
    for s in plan["steps"]:
        refs = ", ".join(r["asset"] for r in s["references"]) or "없음"
        print(f"─ 장면 {s['scene']} [{s['beat']}]  {s['duration']}s  "
              f"(레퍼런스: {refs})")
        print(f"   · 이미지: {s['image_prompt']}")
        print(f"   · 모션:   {s['motion_prompt']}")
        if s["caption"]:
            print(f"   · 자막:   {s['caption']}")
        if s["narration"]:
            print(f"   · 음성:   {s['narration']}")
        print()
    print("→ 위 순서대로 Higgsfield 에서 각 장면을 생성한 뒤,")
    print("  compose_reel.py 로 자막·음성을 합성하면 최종 릴스가 완성됩니다.\n")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="브리프 → Higgsfield 생성 레시피")
    p.add_argument("--brief", "-b", required=True)
    p.add_argument("--lang", "-l", choices=["ko", "en"])
    p.add_argument("--json", action="store_true", help="JSON 으로 출력")
    args = p.parse_args(argv)

    brief = load_brief(args.brief)
    if args.lang:
        brief.language = args.lang
    plan = build_plan(brief)

    if args.json:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
    else:
        print_plan(plan)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
