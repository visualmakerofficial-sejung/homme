"""릴스 설정(JSON) 로딩 및 기본값 정의.

설정 파일 예시는 examples/sosik_sample.json 참고.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Background:
    """장면 배경. type 은 gradient / solid / image 중 하나."""

    type: str = "gradient"
    colors: list[str] = field(default_factory=lambda: ["#FFE082", "#FF8A65"])
    color: str = "#1E1E2E"
    image: str | None = None
    direction: str = "vertical"  # gradient 방향: vertical / diagonal


@dataclass
class Character:
    """등장 캐릭터(이미지) 설정."""

    image: str | None = None
    scale: float = 0.62          # 가로 폭 대비 캐릭터 폭 비율 (0~1)
    y: float = 0.46              # 캐릭터 세로 중심 위치 (0=위, 1=아래)
    anim: str = "bob"            # bob(둥실) / float(좌우) / none
    shadow: bool = True


@dataclass
class Caption:
    """자막 스타일."""

    position: float = 0.74       # 자막 세로 중심 위치 (0~1)
    font_size: int = 86
    color: str = "#FFFFFF"
    stroke_color: str = "#1A1A1A"
    stroke_width: int = 10
    box: bool = True             # 자막 뒤 반투명 박스 표시
    box_color: str = "#000000AA"
    max_chars_per_line: int = 12
    line_spacing: int = 18


@dataclass
class Scene:
    """장면 1개: 화면에 표시될 내용."""

    text: str = ""
    duration: float = 3.0        # 초 (TTS 사용 시 자동 보정될 수 있음)
    background: Background | None = None  # 지정 시 전역 배경을 덮어씀
    character: str | None = None          # 지정 시 전역 캐릭터를 덮어씀(이미지 경로)
    emphasis: bool = False                # 강조 장면(자막 더 크게)


@dataclass
class ReelConfig:
    """릴스 전체 설정."""

    title: str = "reel"
    width: int = 1080
    height: int = 1920
    fps: int = 30
    font: str | None = None
    transition: str = "fade"     # fade(크로스페이드) / cut(하드컷)
    transition_dur: float = 0.4
    background: Background = field(default_factory=Background)
    character: Character = field(default_factory=Character)
    caption: Caption = field(default_factory=Caption)
    scenes: list[Scene] = field(default_factory=list)

    # 오디오
    music: str | None = None         # 배경음악 파일 경로
    music_volume: float = 0.5
    tts: bool = False                # 한국어 TTS 내레이션 자동 생성 (인터넷 필요)
    tts_lang: str = "ko"
    tts_volume: float = 1.0
    narration: str | None = None     # 직접 녹음한 내레이션 오디오 파일(전체)


def _build_background(d: dict[str, Any] | None) -> Background | None:
    if d is None:
        return None
    return Background(**d)


def load_config(path: str) -> ReelConfig:
    """JSON 파일에서 ReelConfig 를 만든다. 상대 경로는 JSON 위치 기준으로 해석."""
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    base_dir = os.path.dirname(os.path.abspath(path))

    def _resolve(p: str | None) -> str | None:
        if not p:
            return p
        if os.path.isabs(p):
            return p
        return os.path.normpath(os.path.join(base_dir, p))

    cfg = ReelConfig()
    for key in ("title", "width", "height", "fps", "font", "transition",
                "transition_dur", "music_volume", "tts", "tts_lang",
                "tts_volume"):
        if key in raw:
            setattr(cfg, key, raw[key])

    cfg.font = _resolve(raw.get("font"))
    cfg.music = _resolve(raw.get("music"))
    cfg.narration = _resolve(raw.get("narration"))

    if "background" in raw:
        cfg.background = Background(**raw["background"])
        cfg.background.image = _resolve(cfg.background.image)

    if "character" in raw:
        cfg.character = Character(**raw["character"])
        cfg.character.image = _resolve(cfg.character.image)

    if "caption" in raw:
        cfg.caption = Caption(**raw["caption"])

    scenes: list[Scene] = []
    for s in raw.get("scenes", []):
        bg = _build_background(s.get("background"))
        if bg is not None:
            bg.image = _resolve(bg.image)
        scene = Scene(
            text=s.get("text", ""),
            duration=float(s.get("duration", 3.0)),
            background=bg,
            character=_resolve(s.get("character")),
            emphasis=bool(s.get("emphasis", False)),
        )
        scenes.append(scene)
    cfg.scenes = scenes

    if not cfg.scenes:
        raise ValueError("설정에 'scenes' 가 비어 있습니다. 최소 1개 장면이 필요합니다.")

    return cfg
