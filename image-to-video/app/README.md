# 캐릭터 광고 스튜디오 (웹앱)

> **캐릭터 선택 + 제품 정보/이미지 + 한 줄 컨셉** 을 넣으면 →
> **스토리 기획 → 컷별 이미지 → 프레임별 영상 → 자동 조립(전환·사운드·로고)** 까지
> 한 화면에서. **팀원에게 링크만 공유**하면 누구나 사용.

조피아처럼 간단 입력 → 자동 스토리보드를 하되, 여기에 더해
**미리 만든 일관된 커스텀 캐릭터**(오랑이/기린새/셀리) + **제품 적용** +
**실제 영상 클립** + **conti 자동 조립**까지 한 줄기로 연결한 점이 다릅니다.

---

## 30초 실행 (설치 없이)

```bash
cd image-to-video/app
python3 -m backend.main          # → http://localhost:8000
```

핵심 앱은 **표준 라이브러리만으로 동작**합니다. (영상 목업/조립에 `ffmpeg` 필요 —
이 환경엔 이미 설치됨. 목업 이미지엔 `pillow`가 있으면 더 예쁩니다)

브라우저에서 `http://localhost:8000` 접속 → 6단계 마법사:

```
① 캐릭터 → ② 제품·컨셉 → ③ 스토리 기획 → ④ 이미지 검수 → ⑤ 프레임 클립 → ⑥ 완성본
```

---

## 팀원에게 링크 공유하기

같은 사무실/네트워크면 서버 PC의 IP로 바로 접속 (`http://<내부IP>:8000`).
외부에서 접속하려면 터널 하나만 띄우면 됩니다:

```bash
# 택1 — 무료 임시 링크
npx localtunnel --port 8000          # → https://xxx.loteu.live
ngrok http 8000                      # → https://xxx.ngrok-free.app
cloudflared tunnel --url http://localhost:8000
```

상시 운영은 사내 서버나 클라우드(예: Render/Railway/EC2)에 올리고
`python3 -m backend.main` 을 서비스로 등록하면 됩니다. (`PORT` 환경변수로 포트 지정)

---

## 키 없이도 끝까지 / 키 넣으면 진짜

| 단계 | 키 없을 때(목업) | 키 넣으면(실제) |
|------|------------------|-----------------|
| ③ 스토리 기획 | 결핍→발견→사용→반전→결말 5컷 기본 아크 | **Claude(opus 4.8)** 가 입력 맞춤 기획 |
| ④ 이미지 | 컷 정보를 담은 9:16 플레이스홀더 | 힉스필드 실제 이미지 |
| ⑤ 영상 | 정지 이미지 5초 클립 | 힉스필드 실제 클립 |
| ⑥ 조립 | **항상 실제** (conti/assemble.py) | 동일 |

→ 키가 없어도 **전체 UI 흐름·조립**이 완전히 동작합니다(시연/기획 확정용).
   키를 꽂으면 같은 흐름이 그대로 실제 생성으로 바뀝니다.

### 키 넣기

```bash
cp .env.example .env
# .env 편집:
#   ANTHROPIC_API_KEY=sk-ant-...     ← ③ 스토리 기획 실제화
#   HIGGSFIELD_API_KEY=...           ← ④⑤ 생성 실제화 (어댑터 자리 준비됨)
pip install -r requirements.txt      # anthropic SDK (Claude 쓸 때만 필요)
python3 -m backend.main
```

> **현재 운영 방식**: 이미지/영상 실제 생성은 이 세션의 **힉스필드 MCP**로 수행합니다.
> 앱은 그때 쓸 **생성 매니페스트**(어떤 프롬프트/레퍼런스로 만들지)를 ③단계에서 정확히
> 산출하므로, 힉스필드 REST 키가 없어도 매니페스트대로 MCP로 만들면 동일한 결과가 됩니다.
> `backend/providers.py` 의 `_higgsfield_image/_video` 가 REST 어댑터 자리입니다.

---

## 구조

```
app/
├─ backend/
│  ├─ main.py        # stdlib HTTP 서버 (프론트 + JSON API)
│  ├─ pipeline.py    # 프로젝트 상태(state.json) 오케스트레이션
│  ├─ planner.py     # ③ PLAN — Claude(opus 4.8) or 목업
│  ├─ providers.py   # ④⑤ 이미지/영상 — 힉스필드 어댑터 or 목업
│  └─ config.py      # 경로·키·.env 로더
├─ frontend/         # index.html · app.js · style.css  (의존성 0 SPA)
├─ data/<project>/   # 런타임 산출물 (state.json, images/, clips/, out/)
├─ .env.example
└─ requirements.txt
```

기존 자산을 그대로 재사용합니다:
- 캐릭터 레지스트리 → `../studio/characters.json`
- 기획 지침 → `../studio/planner_prompt.md`
- 검증·스펙변환 → `../studio/studio.py` (`validate`, `to_spec`)
- 조립 엔진 → `../conti/assemble.py`

## API (자동화/연동용)

```
GET  /api/health                      키 연결 상태
GET  /api/characters                  캐릭터 목록
POST /api/plan                        {character, product, concept, format} → 스토리보드
GET  /api/project/<id>                상태
POST /api/project/<id>/images         ④ 이미지 생성
POST /api/project/<id>/videos         ⑤ 클립 생성
POST /api/project/<id>/assemble       ⑥ 조립 → out/<project>.mp4
GET  /media/<id>/<path>[?download=1]  산출물 서빙/다운로드
```

## 캐릭터 추가

`../studio/characters.json` 에 항목 추가(힉스필드 reference element 등록 후 `element_id` 기입).
앱 재시작 없이 `/api/characters` 에 바로 반영됩니다.

## 참고 — 캐릭터별 안전필터 주의
어린이형 캐릭터(셀리)는 신체 관련/변신 모핑 프롬프트가 안전필터에 걸릴 수 있습니다.
→ **옷 입은 구도**로 표현하고, 변신은 생성 모핑 대신 **편집 전환(fadewhite)** 으로 처리하세요.
(스토리보드 기획 시 자동 반영되도록 `planner_prompt.md` 지침을 따릅니다)
