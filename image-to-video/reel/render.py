"""Pillow 로 각 레이어 이미지를 생성한다.

- 배경(그라데이션/단색/이미지 cover)
- 캐릭터(투명 PNG, 비율 유지 리사이즈 + 그림자)
- 자막(전체 화면 투명 PNG 에 줄바꿈/외곽선/박스 처리)

생성된 PNG 들은 video.py 가 ffmpeg 로 합성·애니메이션한다.
"""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageFont, ImageFilter

from .config import Background, Caption


def _hex_to_rgba(value: str) -> tuple[int, int, int, int]:
    """#RGB / #RRGGBB / #RRGGBBAA 를 RGBA 튜플로 변환."""
    v = value.lstrip("#")
    if len(v) == 3:
        v = "".join(c * 2 for c in v)
    if len(v) == 6:
        r, g, b = (int(v[i:i + 2], 16) for i in (0, 2, 4))
        return (r, g, b, 255)
    if len(v) == 8:
        r, g, b, a = (int(v[i:i + 2], 16) for i in (0, 2, 4, 6))
        return (r, g, b, a)
    raise ValueError(f"잘못된 색상 값: {value}")


def make_background(bg: Background, size: tuple[int, int]) -> Image.Image:
    """배경 RGBA 이미지를 만든다."""
    w, h = size

    if bg.type == "image" and bg.image:
        img = Image.open(bg.image).convert("RGB")
        # cover: 비율 유지하며 화면을 가득 채우도록 크롭
        scale = max(w / img.width, h / img.height)
        nw, nh = int(img.width * scale), int(img.height * scale)
        img = img.resize((nw, nh), Image.LANCZOS)
        left, top = (nw - w) // 2, (nh - h) // 2
        return img.crop((left, top, left + w, top + h)).convert("RGBA")

    if bg.type == "solid":
        return Image.new("RGBA", size, _hex_to_rgba(bg.color))

    # gradient (기본)
    c0 = _hex_to_rgba(bg.colors[0])
    c1 = _hex_to_rgba(bg.colors[-1])
    base = Image.new("RGBA", size)
    px = base.load()
    if bg.direction == "diagonal":
        denom = max(1, (w + h))
        for y in range(h):
            for x in range(w):
                t = (x + y) / denom
                px[x, y] = _lerp_rgba(c0, c1, t)
    else:  # vertical
        for y in range(h):
            t = y / max(1, h - 1)
            row = _lerp_rgba(c0, c1, t)
            for x in range(w):
                px[x, y] = row
    return base


def _lerp_rgba(a, b, t: float):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


def prepare_character(path: str, frame_w: int, scale: float,
                      shadow: bool = True) -> Image.Image:
    """캐릭터 PNG 를 목표 폭으로 리사이즈하고 선택적으로 그림자를 입힌다."""
    img = Image.open(path).convert("RGBA")
    target_w = max(1, int(frame_w * scale))
    ratio = target_w / img.width
    target_h = max(1, int(img.height * ratio))
    img = img.resize((target_w, target_h), Image.LANCZOS)

    if not shadow:
        return img

    pad = 60
    canvas = Image.new("RGBA", (target_w + pad * 2, target_h + pad * 2), (0, 0, 0, 0))
    # 알파 기반 그림자
    alpha = img.split()[3]
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_col = Image.new("RGBA", img.size, (0, 0, 0, 120))
    shadow_layer.paste(shadow_col, (pad, pad + 16), alpha)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas, shadow_layer)
    canvas.paste(img, (pad, pad), img)
    return canvas


def _wrap_text(text: str, max_chars: int) -> list[str]:
    """명시적 줄바꿈(\\n)을 우선하고, 길면 단어/글자 단위로 접는다."""
    lines: list[str] = []
    for raw_line in text.split("\n"):
        raw_line = raw_line.strip()
        if not raw_line:
            lines.append("")
            continue
        if len(raw_line) <= max_chars:
            lines.append(raw_line)
            continue
        # 공백 기준으로 먼저 시도
        words = raw_line.split(" ")
        cur = ""
        for word in words:
            candidate = (cur + " " + word).strip()
            if len(candidate) <= max_chars:
                cur = candidate
            else:
                if cur:
                    lines.append(cur)
                # 한 단어가 너무 길면 글자 단위로 자른다
                while len(word) > max_chars:
                    lines.append(word[:max_chars])
                    word = word[max_chars:]
                cur = word
        if cur:
            lines.append(cur)
    return lines


def render_caption(text: str, size: tuple[int, int], font_path: str,
                   style: Caption, emphasis: bool = False) -> Image.Image:
    """전체 화면 크기의 투명 PNG 에 자막을 그려서 반환한다."""
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    if not text.strip():
        return img

    draw = ImageDraw.Draw(img)
    font_size = int(style.font_size * (1.18 if emphasis else 1.0))
    font = ImageFont.truetype(font_path, font_size)

    lines = _wrap_text(text, style.max_chars_per_line)

    # 각 줄 크기 측정
    line_sizes = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line or " ", font=font,
                             stroke_width=style.stroke_width)
        line_sizes.append((bbox[2] - bbox[0], bbox[3] - bbox[1]))

    line_h = max((s[1] for s in line_sizes), default=font_size)
    total_h = len(lines) * line_h + (len(lines) - 1) * style.line_spacing
    block_w = max((s[0] for s in line_sizes), default=0)

    cx = w // 2
    cy = int(h * style.position)
    top = cy - total_h // 2

    # 반투명 박스
    if style.box and block_w > 0:
        pad_x, pad_y = 48, 36
        box = [cx - block_w // 2 - pad_x, top - pad_y,
               cx + block_w // 2 + pad_x, top + total_h + pad_y]
        radius = 44
        overlay = Image.new("RGBA", size, (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)
        odraw.rounded_rectangle(box, radius=radius,
                                fill=_hex_to_rgba(style.box_color))
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)

    fill = _hex_to_rgba(style.color)
    stroke = _hex_to_rgba(style.stroke_color)

    y = top
    for line, (lw, lh) in zip(lines, line_sizes):
        draw.text((cx, y), line, font=font, fill=fill, anchor="ma",
                  stroke_width=style.stroke_width, stroke_fill=stroke)
        y += line_h + style.line_spacing

    return img
