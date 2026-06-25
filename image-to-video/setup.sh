#!/usr/bin/env bash
# 새 세션(새 컨테이너)에서 영상 제작에 필요한 도구를 설치한다.
# 이미 있으면 건너뛰므로 여러 번 실행해도 안전(idempotent).
set -e

need_apt=0
command -v ffmpeg  >/dev/null 2>&1 || need_apt=1
command -v ffprobe >/dev/null 2>&1 || need_apt=1
fc-list 2>/dev/null | grep -qi nanum || need_apt=1

if [ "$need_apt" = "1" ]; then
  echo "[setup] ffmpeg / 나눔폰트 설치 중..."
  apt-get update -qq >/dev/null 2>&1 || true
  apt-get install -y -qq ffmpeg fonts-nanum >/dev/null 2>&1 || true
fi

# 파이썬 패키지
python3 -c "import PIL" 2>/dev/null || { echo "[setup] Pillow 설치"; pip3 install -q Pillow; }
python3 -c "import gtts" 2>/dev/null || { echo "[setup] gTTS 설치(선택)"; pip3 install -q gTTS || true; }

echo "[setup] 준비 완료:"
echo "  ffmpeg : $(command -v ffmpeg || echo '없음')"
echo "  폰트   : $(fc-list 2>/dev/null | grep -i nanum | head -1 | cut -d: -f1 || echo '없음')"
echo "  Pillow : $(python3 -c 'import PIL;print(PIL.__version__)' 2>/dev/null || echo '없음')"
