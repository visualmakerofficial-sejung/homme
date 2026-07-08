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
- 사진: `gemini-2.5-flash-image` 로 모델 참조 사진 + 옷 사진을 합성.
- 영상: `xai` 는 제공사 스펙에 맞춰 `server.js` 의 `grokXai()` 를 조정,
  `gemini_veo` 는 `predictLongRunning` → 폴링으로 mp4 URL 반환.

## 참고

- 그록(xAI)의 공개 영상 API 스펙이 확정되면 `server.js` 의 `grokXai()` 요청/응답 필드만 맞추면 됩니다.
- 당장 실제 영상까지 확인하려면 `VIDEO_PROVIDER=gemini_veo` 를 권장합니다(문서화된 공개 경로).
