#!/usr/bin/env python3
"""
studio.py — 캐릭터 광고 영상 자동화 파이프라인 (PLAN → IMAGE → VIDEO → ASSEMBLE)

컨셉: 미리 만든 캐릭터 중 하나 선택 + 제품 정보/사진 + 컨셉 → AI가 스토리보드 기획 →
      컷별 이미지 추출 → 이미지별 클립 → CapCut/힉스필드/conti로 완성.

이 CLI는 파이프라인의 '결정·변환'을 담당한다:
  characters            : 선택 가능한 캐릭터 목록
  validate  <sb.json>   : 스토리보드 검증
  manifest  <sb.json>   : 생성 매니페스트 출력 (Stage1 이미지 / Stage2 영상 — 무엇을 어떤 프롬프트/레퍼런스로 만들지)
  spec      <sb.json>   : conti 조립 스펙(JSON) 생성 (클립 다운로드 후 자동 조립용)

실제 '기획(PLAN)'은 LLM(Claude)이 planner_prompt.md 로 수행하고,
'생성(IMAGE/VIDEO)'은 힉스필드가 수행한다(세션에서는 Claude가 MCP로 드라이브,
독립 실행 시 각 API 키 필요). manifest 가 그 실행 목록을 정확히 만들어준다.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load_chars():
    return json.load(open(os.path.join(HERE, "characters.json"), encoding="utf-8"))["characters"]


def load_sb(path):
    return json.load(open(path, encoding="utf-8"))


# ----------------------------------------------------------------- validate
def validate(sb):
    errs = []
    chars = load_chars()
    if sb.get("character") not in chars:
        errs.append(f"character '{sb.get('character')}' 가 characters.json 에 없음")
    shots = sb.get("shots", [])
    if not (4 <= len(shots) <= 6):
        errs.append(f"shots 는 4~6개여야 함 (현재 {len(shots)})")
    ids = [s.get("id") for s in shots]
    for s in shots:
        if not s.get("id"): errs.append("id 없는 컷")
        role = s.get("role")
        if role not in ("beat", "transition"):
            errs.append(f"{s.get('id')}: role 은 beat|transition")
        if role == "beat" and not s.get("image_prompt"):
            errs.append(f"{s.get('id')}: beat 는 image_prompt 필요")
        if role == "transition" and s.get("morph_from"):
            for k in ("morph_from", "morph_to"):
                if s.get(k) not in ids:
                    errs.append(f"{s.get('id')}: {k}='{s.get(k)}' 가 존재하지 않는 컷")
        if not s.get("video_model"):
            errs.append(f"{s.get('id')}: video_model 필요")
    if not sb.get("product", {}).get("name"):
        errs.append("product.name 필요")
    return errs


# ----------------------------------------------------------------- manifest
def manifest(sb):
    chars = load_chars()
    ch = chars[sb["character"]]
    el = ch["element_id"]
    prod = sb["product"]
    prod_refs = prod.get("image_refs", [])
    shots = sb["shots"]
    by_id = {s["id"]: s for s in shots}

    def refs_str():
        seen, parts = set(), []
        for r in [el] + list(prod_refs):
            if r and r not in seen:
                seen.add(r); parts.append(f"<<<{r}>>>")
        return " ".join(parts)

    out = []
    out.append("=" * 70)
    out.append(f"PROJECT: {sb['project']}   CHARACTER: {ch['name']} ({sb['character']})")
    out.append(f"PRODUCT: {prod['name']}")
    out.append(f"CONCEPT: {sb.get('concept','')}")
    out.append("=" * 70)

    # ---- STAGE 1: 이미지 생성 (beat + 자체 키프레임 transition) ----
    out.append("\n## STAGE 1 — 이미지 추출 (generate_image, model=nano_banana_pro)")
    out.append("   레퍼런스(일관성): 캐릭터 element + 제품 ref 를 프롬프트에 <<<id>>> 로 삽입")
    n = 0
    for s in shots:
        if s["role"] == "transition" and s.get("morph_from"):
            continue  # 모핑 transition 은 별도 이미지 불필요(인접 beat 이미지 사용)
        if not s.get("image_prompt"):
            continue
        n += 1
        out.append(f"\n[IMG {s['id']}] {s.get('title','')}")
        out.append(f"  prompt: {refs_str()} {s['image_prompt']}")
        out.append(f"  params: aspect 9:16, count 2  (검수 후 1장 선택)")
    out.append(f"\n  → 총 {n} 장 생성. 마음에 들면 STAGE 2 진행.")

    # ---- STAGE 2: 영상 생성 ----
    out.append("\n## STAGE 2 — 이미지별 영상 (generate_video)")
    cs = sb.get("format", {}).get("clip_seconds", 5)
    for s in shots:
        out.append(f"\n[VID {s['id']}] {s.get('title','')}  ({s['video_model']}, {cs}s)")
        if s["role"] == "transition" and s.get("morph_from"):
            out.append(f"  start_image = {s['morph_from']} 이미지,  end_image = {s['morph_to']} 이미지  (Seedance 모핑)")
        else:
            out.append(f"  start_image = {s['id']} 이미지")
        out.append(f"  motion: {s.get('motion_prompt','')}")
    out.append("\n  → 완성 클립 다운로드 → `studio.py spec` 으로 조립 스펙 생성 → conti/assemble.py")
    return "\n".join(out)


# ----------------------------------------------------- storyboard → conti spec
def to_spec(sb, clipdir="clips"):
    cs = float(sb.get("format", {}).get("clip_seconds", 5))
    shots = sb["shots"]
    clips, seams = [], []
    sfx = []
    for i, s in enumerate(shots):
        clips.append({"file": f"{clipdir}/{s['id']}.mp4", "role": s["role"], "note": s.get("title", "")})
        if i > 0:
            seams.append({"effect": shots[i].get("transition_effect", "cut")})
        base = i * cs
        for ev in s.get("sfx", []):
            sfx.append({"at": round(base + float(ev.get("at_rel", 0)), 2),
                        "type": ev["type"], "gain": ev.get("gain", 1.0)})
    total = len(shots) * cs
    aud = sb.get("audio", {})
    spec = {
        "_generated_from": sb["project"],
        "output": {"path": f"out/{sb['project']}.mp4", "width": 720, "height": 1280, "fps": 24},
        "clips": clips,
        "seams": seams,
        "audio": {
            "use_native": aud.get("use_native", True),
            "native_gain": aud.get("native_gain", 1.1),
            "bgm": {"file": aud.get("bgm", "assets/demo_bgm.m4a"), "gain": aud.get("bgm_gain", 0.22), "loop": True} if aud.get("bgm") else None,
            "sfx_gain": 0.9,
            "sfx": sfx,
            "master_fade_out": 0.9,
        },
        "captions": ([{"text": sb["ending_logo"], "style": "logo", "y": 0.40,
                       "start": round(total - cs + 2.3, 2), "end": 99}] if sb.get("ending_logo") else []),
        "video_fades": {"in": 0.3, "out": 0.3},
    }
    if not spec["audio"]["bgm"]:
        del spec["audio"]["bgm"]
    return spec


# ----------------------------------------------------------------- cli
def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    cmd = sys.argv[1]
    if cmd == "characters":
        for k, c in load_chars().items():
            print(f"  {k:10s} — {c['name']} ({c['species']}) · element={c['element_id'][:8]}…")
        return
    if cmd in ("validate", "manifest", "spec"):
        sb = load_sb(sys.argv[2])
        errs = validate(sb)
        if cmd == "validate":
            if errs:
                print("❌ 검증 실패:"); [print("  -", e) for e in errs]; sys.exit(1)
            print("✅ 스토리보드 유효 —", len(sb["shots"]), "컷"); return
        if errs:
            print("⚠️  검증 경고:"); [print("  -", e) for e in errs]
        if cmd == "manifest":
            print(manifest(sb))
        elif cmd == "spec":
            clipdir = "clips"
            if "--clips" in sys.argv:
                clipdir = sys.argv[sys.argv.index("--clips") + 1]
            spec = to_spec(sb, clipdir)
            outp = os.path.splitext(sys.argv[2])[0] + ".assemble.json"
            json.dump(spec, open(outp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            print(f"[✓] 조립 스펙 생성: {outp}")
            print(f"    → cp 클립들을 {clipdir}/<id>.mp4 로 두고: python3 ../conti/assemble.py {outp}")
        return
    print("unknown command:", cmd); print(__doc__)


if __name__ == "__main__":
    main()
