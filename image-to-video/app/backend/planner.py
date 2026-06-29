"""PLAN 단계 — 입력(캐릭터+제품+컨셉) → 스토리보드 JSON.

- ANTHROPIC_API_KEY 가 있으면 Claude(opus 4.8)로 진짜 기획.
- 없으면 결핍→발견→사용→변화→결말 아크를 따르는 5컷 목업 스토리보드를 만들어
  키 없이도 UI 흐름(검토·생성목록·조립스펙)이 끝까지 동작하게 한다.
"""
import json
import re

from . import config

PLANNER_PROMPT = (config.STUDIO_DIR / "planner_prompt.md").read_text(encoding="utf-8")


def _extract_json(text: str) -> str:
    """모델 응답에서 JSON 본문만 추출 (코드펜스/잡설 제거)."""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if m:
        return m.group(1)
    s, e = text.find("{"), text.rfind("}")
    if s != -1 and e != -1 and e > s:
        return text[s:e + 1]
    return text


def _claude_plan(character_key, character_def, product, concept, fmt) -> dict:
    from anthropic import Anthropic  # 공식 SDK

    client = Anthropic()  # ANTHROPIC_API_KEY 자동 사용
    user = json.dumps({
        "character": {"key": character_key, **character_def},
        "product": product,
        "concept": concept,
        "format": fmt,
        "instruction": "위 입력으로 schema 구조의 스토리보드 JSON만 출력. character 키는 그대로 사용.",
    }, ensure_ascii=False)

    # claude-api 스킬 지침: opus 4.8 + adaptive thinking + effort high.
    # 구조적 출력은 프롬프트로 'JSON만' 강제 후 파싱(API drift 안전).
    resp = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        output_config={"effort": "high"},
        system=PLANNER_PROMPT,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")
    sb = json.loads(_extract_json(text))
    sb["character"] = character_key  # 안전장치
    return sb


def _mock_plan(character_key, character_def, product, concept, fmt) -> dict:
    """API 키 없이도 동작하는 기본 아크(결핍→발견→사용→반전→결말) 5컷."""
    name = character_def.get("name", character_key)
    pname = product.get("name", "제품")
    refs = product.get("image_refs", [])
    cs = fmt.get("clip_seconds", 5)
    consistent = "9:16, cute 3D Pixar style, keep character consistent."

    shots = [
        {
            "id": "S1", "role": "beat", "title": "결핍/문제",
            "image_prompt": f"{name} looking a bit down and unsatisfied, expressing the problem that '{concept}' solves, in a relatable everyday setting. {consistent}",
            "motion_prompt": "Sighs, shows the problem with a worried expression.",
            "video_model": "kling3_0_turbo", "transition_effect": "cut",
            "sfx": [{"at_rel": 3.0, "type": "pop", "gain": 0.4}], "caption": None,
        },
        {
            "id": "S2", "role": "beat", "title": "제품 발견",
            "image_prompt": f"{name} discovering the {pname}, eyes sparkling with curiosity and excitement, product packaging clearly visible. {consistent}",
            "motion_prompt": f"Finds the {pname}, gasps, picks it up and inspects it with delight.",
            "video_model": "kling3_0_turbo", "transition_effect": "cut",
            "sfx": [{"at_rel": 2.4, "type": "spark", "gain": 0.9}], "caption": None,
        },
        {
            "id": "S3", "role": "beat", "title": "사용",
            "image_prompt": f"{name} happily using the {pname}, soft sparkles and a pleasant glow around, showing the product in action. {consistent}",
            "motion_prompt": f"Uses the {pname}, satisfied expression, gentle shimmer effect.",
            "video_model": "kling3_0_turbo", "transition_effect": "cut",
            "sfx": [{"at_rel": 1.0, "type": "whoosh", "gain": 0.7}, {"at_rel": 1.7, "type": "shimmer", "gain": 0.6}], "caption": None,
        },
        {
            "id": "S4", "role": "beat", "title": "반전/변화",
            "image_prompt": f"{name} amazed at the wonderful result after using the {pname}, radiant and delighted, bright luminous lighting, sparkles all around. {consistent}",
            "motion_prompt": "Eyes pop open amazed at the transformation, beaming with joy.",
            "video_model": "kling3_0_turbo", "transition_effect": "fadewhite",
            "sfx": [{"at_rel": 0.0, "type": "whoosh", "gain": 0.8}, {"at_rel": 0.5, "type": "shimmer", "gain": 1.0}, {"at_rel": 1.2, "type": "spark", "gain": 1.0}], "caption": None,
        },
        {
            "id": "S5", "role": "beat", "title": "행복한 결말 + 제품샷",
            "image_prompt": f"{name} happily presenting the {pname} with a big proud smile, product hero shot, uplifting bright background, sparkles. {consistent}",
            "motion_prompt": f"Holds up the {pname} proudly, cheerful pose, twinkle.",
            "video_model": "kling3_0_turbo", "transition_effect": "cut",
            "sfx": [{"at_rel": 1.9, "type": "spark", "gain": 0.8}], "caption": None,
        },
    ]
    return {
        "project": f"{character_key}_{re.sub(r'[^a-zA-Z0-9]+', '_', pname).strip('_').lower() or 'ad'}",
        "character": character_key,
        "product": {"name": pname, "info": product.get("info", ""), "image_refs": refs},
        "concept": concept,
        "format": {"aspect": fmt.get("aspect", "9:16"), "clip_seconds": cs},
        "shots": shots,
        "audio": {"use_native": True, "native_gain": 1.1, "bgm": "assets/demo_bgm.m4a", "bgm_gain": 0.22},
        "ending_logo": [pname, product.get("subcopy", "")],
        "_planner": "mock",
    }


def plan(character_key, character_def, product, concept, fmt) -> dict:
    if config.have_claude():
        try:
            sb = _claude_plan(character_key, character_def, product, concept, fmt)
            sb["_planner"] = "claude"
            return sb
        except Exception as e:  # 키는 있으나 실패 시 목업으로 폴백 + 사유 표기
            sb = _mock_plan(character_key, character_def, product, concept, fmt)
            sb["_planner_error"] = str(e)
            return sb
    return _mock_plan(character_key, character_def, product, concept, fmt)
