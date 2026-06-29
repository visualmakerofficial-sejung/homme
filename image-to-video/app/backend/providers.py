"""IMAGE / VIDEO 생성 어댑터.

- 힉스필드 API 키가 있으면 실제 생성을 시도(어댑터 자리).
- 없으면 목업: PIL 로 컷 정보를 담은 9:16 플레이스홀더 이미지를 만들어
  갤러리 검수 → 선택 → (영상 자리표시) 흐름이 키 없이도 끝까지 동작한다.

세션 운영방식(현재): 실제 생성은 힉스필드 MCP 로 수행하고,
이 앱은 '무엇을 어떤 프롬프트/레퍼런스로 만들지' 매니페스트를 정확히 산출한다.
"""
import textwrap
from pathlib import Path

from . import config


# ---------------------------------------------------------------- 매니페스트
def build_manifest(sb: dict, character_def: dict) -> dict:
    """스토리보드 → STAGE1(이미지)/STAGE2(영상) 실행 목록.
    studio.manifest 와 동일 논리. <<<id>>> 레퍼런스로 일관성 유지."""
    el = character_def.get("element_id")
    prod_refs = sb.get("product", {}).get("image_refs", [])
    seen, ref_parts = set(), []
    for r in [el] + list(prod_refs):
        if r and r not in seen:
            seen.add(r)
            ref_parts.append(f"<<<{r}>>>")
    refs = " ".join(ref_parts)

    images, videos = [], []
    cs = sb.get("format", {}).get("clip_seconds", 5)
    for s in sb["shots"]:
        is_morph = s["role"] == "transition" and s.get("morph_from")
        if not is_morph and s.get("image_prompt"):
            images.append({
                "id": s["id"], "title": s.get("title", ""),
                "model": "nano_banana_pro",
                "prompt": f"{refs} {s['image_prompt']}".strip(),
                "aspect": sb.get("format", {}).get("aspect", "9:16"),
            })
        v = {"id": s["id"], "title": s.get("title", ""),
             "model": s["video_model"], "seconds": cs,
             "motion": s.get("motion_prompt", "")}
        if is_morph:
            v["start_image"] = s["morph_from"]
            v["end_image"] = s["morph_to"]
        else:
            v["start_image"] = s["id"]
        videos.append(v)
    return {"references": refs, "stage1_images": images, "stage2_videos": videos}


# ---------------------------------------------------------------- 목업 이미지
def _placeholder_image(out_path: Path, shot_id: str, title: str, prompt: str,
                       product_name: str, idx: int):
    from PIL import Image, ImageDraw, ImageFont

    W, H = 720, 1280
    palette = [(255, 228, 240), (220, 238, 255), (230, 255, 235),
               (255, 244, 220), (240, 230, 255), (255, 235, 235)]
    bg = palette[idx % len(palette)]
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    font = config.STUDIO_DIR  # placeholder
    fp = "/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf"

    def F(sz):
        try:
            return ImageFont.truetype(fp, sz)
        except Exception:
            return ImageFont.load_default()

    # 상단 배지
    d.rounded_rectangle([40, 60, W - 40, 230], radius=28, fill=(255, 255, 255))
    d.text((70, 90), shot_id, font=F(64), fill=(60, 60, 70))
    d.text((70, 165), title or "", font=F(34), fill=(120, 120, 140))

    # 중앙 미리보기 박스
    d.rounded_rectangle([60, 300, W - 60, 940], radius=24,
                        outline=(255, 255, 255), width=6)
    d.text((W // 2, 620), "PREVIEW", font=F(52), fill=(255, 255, 255), anchor="mm")
    d.text((W // 2, 690), "(목업 — 힉스필드 키 연결 시 실제 생성)",
           font=F(24), fill=(255, 255, 255), anchor="mm")

    # 프롬프트 발췌
    y = 990
    for line in textwrap.wrap(prompt, width=42)[:6]:
        d.text((60, y), line, font=F(26), fill=(90, 90, 100))
        y += 38

    # 푸터 로고
    d.text((W // 2, H - 60), f"EAU DE SILK · {product_name}", font=F(28),
           fill=(70, 70, 80), anchor="mm")
    img.save(out_path, "PNG")


def generate_images(project_dir: Path, manifest: dict, product_name: str) -> list:
    """각 STAGE1 이미지를 생성(목업 or 실제). 결과 메타 리스트 반환."""
    img_dir = project_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    results = []
    real = config.have_higgsfield()
    for i, item in enumerate(manifest["stage1_images"]):
        fname = f"{item['id']}.png"
        out = img_dir / fname
        mode = "mock"
        if real:
            try:
                _higgsfield_image(item, out)
                mode = "higgsfield"
            except Exception:
                _placeholder_image(out, item["id"], item["title"], item["prompt"], product_name, i)
        else:
            _placeholder_image(out, item["id"], item["title"], item["prompt"], product_name, i)
        results.append({"id": item["id"], "title": item["title"],
                        "file": f"images/{fname}", "prompt": item["prompt"], "mode": mode})
    return results


def generate_videos(project_dir: Path, manifest: dict) -> list:
    """각 STAGE2 클립을 생성(목업=정지프레임 5s mp4 or 실제)."""
    clip_dir = project_dir / "clips"
    clip_dir.mkdir(parents=True, exist_ok=True)
    img_dir = project_dir / "images"
    results = []
    real = config.have_higgsfield()
    for v in manifest["stage2_videos"]:
        fname = f"{v['id']}.mp4"
        out = clip_dir / fname
        mode = "mock"
        if real:
            try:
                _higgsfield_video(v, out)
                mode = "higgsfield"
            except Exception:
                _mock_clip(img_dir / f"{v['start_image']}.png", out, v["seconds"])
        else:
            _mock_clip(img_dir / f"{v['start_image']}.png", out, v["seconds"])
        results.append({"id": v["id"], "title": v["title"],
                        "file": f"clips/{fname}", "model": v["model"], "mode": mode})
    return results


def _mock_clip(src_png: Path, out_mp4: Path, seconds):
    """정지 이미지를 N초 mp4 로 (검수/조립 흐름 확인용 자리표시)."""
    import subprocess
    if not src_png.exists():
        # start_image 가 morph 일 경우 등 — 회색 클립
        subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                        f"color=c=gray:s=720x1280:d={seconds}:r=24",
                        "-pix_fmt", "yuv420p", str(out_mp4)],
                       capture_output=True)
        return
    subprocess.run(["ffmpeg", "-y", "-loop", "1", "-i", str(src_png),
                    "-t", str(seconds), "-r", "24",
                    "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,format=yuv420p",
                    str(out_mp4)], capture_output=True)


# ---------------------------------------------------------------- 실제 힉스필드(어댑터 자리)
def _higgsfield_image(item, out_path):
    """힉스필드 이미지 생성 어댑터. API 키로 직접 호출 시 여기에 구현.
    현재 세션 운영방식은 MCP(generate_image)로 수행하므로 미구현."""
    raise NotImplementedError("Higgsfield REST 이미지 생성 미구성 — 목업/ MCP 사용")


def _higgsfield_video(v, out_path):
    raise NotImplementedError("Higgsfield REST 영상 생성 미구성 — 목업/ MCP 사용")
