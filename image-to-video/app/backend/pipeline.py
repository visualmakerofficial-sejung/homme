"""파이프라인 오케스트레이션 — 프로젝트 상태(state.json) 중심.

프로젝트 디렉토리: data/<project_id>/
  state.json         : 입력 + 스토리보드 + 단계별 산출
  images/<id>.png    : STAGE1 이미지
  clips/<id>.mp4     : STAGE2 클립
  <project>.assemble.json, out/<project>.mp4 : 조립
"""
import json
import re
import sys
import uuid
from pathlib import Path

from . import config, planner, providers

# studio.py 의 검증/스펙 변환 재사용
sys.path.insert(0, str(config.STUDIO_DIR))
import studio  # noqa: E402


def _chars() -> dict:
    return json.loads((config.STUDIO_DIR / "characters.json").read_text(encoding="utf-8"))["characters"]


def list_characters() -> list:
    out = []
    for k, c in _chars().items():
        out.append({"key": k, "name": c.get("name"), "species": c.get("species"),
                    "personality": c.get("personality"), "look": c.get("look"),
                    "element_id": c.get("element_id")})
    return out


def _slug(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9가-힣]+", "-", s).strip("-")[:40] or "project"


def _proj_dir(pid: str) -> Path:
    return config.DATA_DIR / pid


def _load_state(pid: str) -> dict:
    p = _proj_dir(pid) / "state.json"
    if not p.exists():
        raise FileNotFoundError(f"프로젝트 없음: {pid}")
    return json.loads(p.read_text(encoding="utf-8"))


def _save_state(pid: str, st: dict):
    (_proj_dir(pid)).mkdir(parents=True, exist_ok=True)
    (_proj_dir(pid) / "state.json").write_text(
        json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- 1) PLAN
def create_project(character_key, product, concept, fmt) -> dict:
    chars = _chars()
    if character_key not in chars:
        raise ValueError(f"알 수 없는 캐릭터: {character_key}")
    fmt = fmt or {"aspect": "9:16", "clip_seconds": 5}
    sb = planner.plan(character_key, chars[character_key], product, concept, fmt)

    errs = studio.validate(sb)
    pid = f"{_slug(sb.get('project', character_key))}-{uuid.uuid4().hex[:6]}"
    manifest = providers.build_manifest(sb, chars[character_key])
    st = {
        "id": pid, "stage": "planned",
        "input": {"character": character_key, "product": product,
                  "concept": concept, "format": fmt},
        "storyboard": sb, "manifest": manifest,
        "validation": errs, "planner": sb.get("_planner", "mock"),
        "images": [], "clips": [], "output": None,
        "modes": {"claude": config.have_claude(), "higgsfield": config.have_higgsfield()},
    }
    _save_state(pid, st)
    return st


# ---------------------------------------------------------------- 2) IMAGE
def run_images(pid: str) -> dict:
    st = _load_state(pid)
    pname = st["storyboard"].get("product", {}).get("name", "제품")
    st["images"] = providers.generate_images(_proj_dir(pid), st["manifest"], pname)
    st["stage"] = "images"
    _save_state(pid, st)
    return st


# ---------------------------------------------------------------- 3) VIDEO
def run_videos(pid: str) -> dict:
    st = _load_state(pid)
    st["clips"] = providers.generate_videos(_proj_dir(pid), st["manifest"])
    st["stage"] = "videos"
    _save_state(pid, st)
    return st


# ---------------------------------------------------------------- 4) ASSEMBLE
def run_assemble(pid: str) -> dict:
    st = _load_state(pid)
    pd = _proj_dir(pid)
    sb = st["storyboard"]
    # 조립 스펙(상대경로 = 프로젝트 디렉토리 기준)
    spec = studio.to_spec(sb, clipdir="clips")
    spec["output"]["path"] = f"out/{sb['project']}.mp4"
    # BGM/SFX 자산은 conti 디렉토리 기준 → 절대경로로 치환
    aud = spec.get("audio", {})
    if aud.get("bgm") and aud["bgm"].get("file"):
        bgm = aud["bgm"]["file"]
        if not Path(bgm).is_absolute():
            aud["bgm"]["file"] = str((config.CONTI_DIR / bgm).resolve())
    spec_path = pd / f"{sb['project']}.assemble.json"
    spec_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    # conti/assemble.py 실행 (cwd = 프로젝트 디렉토리 → clips/, out/ 상대경로 해석)
    import subprocess
    (pd / "out").mkdir(exist_ok=True)
    r = subprocess.run([sys.executable, str(config.CONTI_DIR / "assemble.py"), str(spec_path)],
                       cwd=str(pd), capture_output=True, text=True)
    if r.returncode != 0:
        st["assemble_error"] = r.stderr[-2000:]
        st["stage"] = "videos"
        _save_state(pid, st)
        raise RuntimeError(r.stderr[-1200:])
    st["output"] = f"out/{sb['project']}.mp4"
    st["stage"] = "assembled"
    st.pop("assemble_error", None)
    _save_state(pid, st)
    return st


def get_state(pid: str) -> dict:
    return _load_state(pid)


def list_projects() -> list:
    out = []
    for d in sorted(config.DATA_DIR.glob("*/state.json")):
        try:
            st = json.loads(d.read_text(encoding="utf-8"))
            out.append({"id": st["id"], "stage": st["stage"],
                        "project": st["storyboard"].get("project"),
                        "character": st["input"]["character"],
                        "product": st["storyboard"].get("product", {}).get("name")})
        except Exception:
            continue
    return out
