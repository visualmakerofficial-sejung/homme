"""광고 릴스 '브리프' 스키마.

캐릭터 이미지 + 제품 이미지 + 장면별(문제→제품→사용→결과) 연출을 담는다.
이 브리프 하나로 (1) Higgsfield AI 생성 레시피와 (2) 자막/음성 합성을
모두 구동한다. 언어(KO/EN)는 영상마다 고를 수 있다.

예시: briefs/hairbrush_ko.json
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any

# 장면 흐름 단계 — 광고의 기본 4박자
BEATS = ("problem", "product", "use", "result")


@dataclass
class Asset:
    """레퍼런스 이미지(캐릭터 또는 제품)."""

    image: str | None = None       # 첨부 이미지 경로 (없으면 AI가 설명만으로 생성)
    name: str = ""
    description: str = ""           # AI 프롬프트에 들어갈 영문 묘사(일관성·정확도용)


@dataclass
class AdScene:
    """장면 1개."""

    beat: str = "problem"          # problem | product | use | result (자유 확장 가능)
    image_prompt: str = ""         # 장면 정지 이미지(키프레임) 생성 프롬프트(영문 권장)
    motion_prompt: str = ""        # 그 이미지를 어떻게 움직일지(영문 권장)
    use_product: bool = False      # 이 장면에 제품 레퍼런스를 함께 넣을지
    duration: float = 4.0          # 초
    caption: dict[str, str] = field(default_factory=dict)    # {"ko": "...", "en": "..."}
    narration: dict[str, str] = field(default_factory=dict)  # {"ko": "...", "en": "..."}


@dataclass
class AdBrief:
    """광고 릴스 전체 브리프."""

    title: str = "ad"
    language: str = "ko"           # 이 영상의 기본 언어 (ko | en) — 영상마다 선택
    width: int = 1080
    height: int = 1920
    fps: int = 30
    aspect: str = "9:16"

    character: Asset = field(default_factory=Asset)
    product: Asset = field(default_factory=Asset)

    # 생성 설정 (Higgsfield)
    video_model: str = "seedance_2_0"   # 레퍼런스 기반 i2v + 캐릭터 일관성
    image_model: str = "nano_banana"    # 키프레임 합성(캐릭터+제품 멀티 레퍼런스)
    resolution: str = "1080p"
    style: str = ("cute chunky 3D Pixar/Disney style, big sparkly eyes, soft "
                  "studio lighting, glossy render, vertical 9:16")

    # 오디오
    voice_mode: str = "tts"        # tts(자동 음성) | clip(AI 클립 원음 유지) | none
    voice_lang: str | None = None  # None 이면 language 따라감
    music: str | None = None
    music_volume: float = 0.35
    voice_volume: float = 1.0

    # 합성
    transition: str = "fade"
    transition_dur: float = 0.35

    scenes: list[AdScene] = field(default_factory=list)

    # ---- 편의 메서드 ----
    def lang_for_voice(self) -> str:
        return self.voice_lang or self.language

    def caption_text(self, scene: AdScene) -> str:
        """현재 언어에 맞는 자막. 없으면 다른 언어로 폴백."""
        return scene.caption.get(self.language) or _any(scene.caption)

    def narration_text(self, scene: AdScene) -> str:
        lang = self.lang_for_voice()
        return scene.narration.get(lang) or _any(scene.narration)


def _any(d: dict[str, str]) -> str:
    for v in d.values():
        if v:
            return v
    return ""


def load_brief(path: str) -> AdBrief:
    """JSON 브리프를 읽어 AdBrief 로 만든다. 상대 경로는 JSON 위치 기준."""
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    base = os.path.dirname(os.path.abspath(path))

    def resolve(p: str | None) -> str | None:
        if not p:
            return p
        return p if os.path.isabs(p) else os.path.normpath(os.path.join(base, p))

    brief = AdBrief()
    for k in ("title", "language", "width", "height", "fps", "aspect",
              "video_model", "image_model", "resolution", "style",
              "voice_mode", "voice_lang", "music_volume", "voice_volume",
              "transition", "transition_dur"):
        if k in raw:
            setattr(brief, k, raw[k])

    if "character" in raw:
        brief.character = Asset(**raw["character"])
        brief.character.image = resolve(brief.character.image)
    if "product" in raw:
        brief.product = Asset(**raw["product"])
        brief.product.image = resolve(brief.product.image)

    brief.music = resolve(raw.get("music"))

    scenes: list[AdScene] = []
    for s in raw.get("scenes", []):
        scenes.append(AdScene(
            beat=s.get("beat", "problem"),
            image_prompt=s.get("image_prompt", ""),
            motion_prompt=s.get("motion_prompt", ""),
            use_product=bool(s.get("use_product", s.get("beat") in ("product", "use", "result"))),
            duration=float(s.get("duration", 4.0)),
            caption=s.get("caption", {}) or {},
            narration=s.get("narration", {}) or {},
        ))
    brief.scenes = scenes
    if not brief.scenes:
        raise ValueError("브리프에 'scenes' 가 비어 있습니다.")
    return brief
