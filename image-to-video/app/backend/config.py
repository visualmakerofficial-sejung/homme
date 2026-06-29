"""앱 전역 설정 / 경로. .env 가 있으면 읽어서 환경변수로 주입한다(의존성 없이)."""
import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent          # image-to-video/app
ROOT = APP_DIR.parent                                      # image-to-video
STUDIO_DIR = ROOT / "studio"
CONTI_DIR = ROOT / "conti"
DATA_DIR = APP_DIR / "data"                                # 런타임 산출물(프로젝트별)
FRONTEND_DIR = APP_DIR / "frontend"


def _load_dotenv():
    """가벼운 .env 로더 (python-dotenv 없이 동작). 이미 설정된 환경변수는 보존."""
    for p in (APP_DIR / ".env", ROOT / ".env"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)


_load_dotenv()
DATA_DIR.mkdir(parents=True, exist_ok=True)


def have_claude() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def have_higgsfield() -> bool:
    return bool(os.environ.get("HIGGSFIELD_API_KEY"))


# 모델 (claude-api 스킬 지침: opus 4.8 + adaptive thinking + effort high)
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-4-8")
