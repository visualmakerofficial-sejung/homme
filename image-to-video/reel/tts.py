"""한국어 TTS(선택 기능).

gTTS(Google Translate TTS) 를 사용한다. 인터넷이 필요하며, 패키지가 없거나
네트워크가 막히면 호출 측에서 graceful 하게 자막-only 로 동작한다.
"""

from __future__ import annotations


def is_available() -> bool:
    try:
        import gtts  # noqa: F401
        return True
    except Exception:
        return False


def synthesize(text: str, out_path: str, lang: str = "ko") -> bool:
    """text 를 음성 mp3 로 out_path 에 저장. 성공 시 True."""
    text = (text or "").replace("\n", " ").strip()
    if not text:
        return False
    try:
        from gtts import gTTS
        gTTS(text=text, lang=lang).save(out_path)
        return True
    except Exception as exc:  # 네트워크/패키지 오류
        print(f"  [TTS] 실패 ({exc}) — 이 장면은 음성 없이 진행합니다.")
        return False
