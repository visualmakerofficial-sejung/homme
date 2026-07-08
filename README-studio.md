# Grok Studio — 실제 구동 가이드

모델을 고르고 · 옷 사진을 올리면 → 모델이 그 옷을 입은 **사진**과 **영상**을 생성합니다.
- 사진: **제미나이(Gemini)**
- 영상: **그록(xAI)** 또는 **제미나이 Veo** (오늘 바로 동작하는 경로)

## 실행

```bash
# 1) 키 설정
cp .env.example .env
#   .env 를 열어 GEMINI_API_KEY 등을 채웁니다

# 2) 서버 실행 (의존성 없음, Node 18+)
node server.js
#   또는  npm start

# 3) 브라우저에서 열기
#   http://localhost:5173
```

키를 하나도 넣지 않아도 **데모 모드**로 실제 파일(사진 PNG · 세로 영상 WEBM)을 만들어
전체 UI/흐름을 그대로 테스트할 수 있습니다. `.env` 에 키를 넣고 서버를 재시작하면 그 즉시 실제 생성으로 바뀝니다.

## .env 항목

| 변수 | 설명 |
|---|---|
| `PORT` | 서버 포트 (기본 5173) |
| `GEMINI_API_KEY` | 제미나이 키 — 사진 생성 및 Veo 영상에 사용. https://aistudio.google.com/apikey |
| `GEMINI_IMAGE_MODEL` | 이미지 모델 (기본 `gemini-2.5-flash-image`) |
| `VIDEO_PROVIDER` | `xai` 또는 `gemini_veo` (비우면 영상은 데모) |
| `XAI_API_KEY` / `XAI_VIDEO_URL` / `XAI_VIDEO_MODEL` | `VIDEO_PROVIDER=xai` 일 때 |
| `GEMINI_VEO_MODEL` | `VIDEO_PROVIDER=gemini_veo` 일 때 (기본 `veo-3.0-generate-preview`) |

## 동작 구조

- `server.js` — 정적 파일 서빙 + `/api/photo`, `/api/video`, `/api/config`. 키는 **서버에만** 보관됩니다.
- 프론트(`studio.js`/`studio-api.js`)는 시작 시 `/api/config` 를 확인해
  서버 연동 → (없으면) 브라우저 키 → (없으면) 데모 순으로 생성합니다.
- 사진: `gemini-2.5-flash-image` 로 모델 참조 사진 + 옷 사진을 합성 → 실사 착장 이미지.
- 영상(2단계 파이프라인, `/api/video`):
  1. **착장 스틸 생성** — 모델 얼굴 + 옷 사진 → 제미나이로 "모델이 옷을 입은" 세로 전신 이미지.
  2. **회전 영상** — 그 스틸을 첫 프레임으로 삼아
     `gemini_veo`(Veo, `predictLongRunning`→폴링) 또는 `xai`(그록)로 영상화.
  → 그래서 "이미지가 도는" 게 아니라 **사람이 옷 입고 도는** 영상이 나옵니다.

## ⚠️ 배포된 정적 링크(GitHub Pages)는 "데모 전용"

`https://<owner>.github.io/homme/studio.html` 는 서버가 없는 정적 호스팅이라
**항상 데모(미리보기 일러스트)** 로만 동작합니다. **실제 인물 영상**을 뽑으려면:
1. `.env` 에 `GEMINI_API_KEY` 넣고 `VIDEO_PROVIDER=gemini_veo` (Veo 사용 권한 필요),
2. `node server.js` 로 서버를 켜거나 서버를 호스팅(예: Render/Fly/VM)에 배포,
3. 그 서버 주소로 접속하면 위 2단계 파이프라인이 실제로 동작합니다.
정적 링크는 "체험판", 서버+키가 "실사 웹앱"입니다.

## 참고

- 그록(xAI)의 공개 영상 API 스펙이 확정되면 `server.js` 의 `grokXai()` 요청/응답 필드만 맞추면 됩니다.
- 당장 실제 영상까지 확인하려면 `VIDEO_PROVIDER=gemini_veo` 를 권장합니다(문서화된 공개 경로).
