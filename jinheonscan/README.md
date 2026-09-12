# 진헌스캔 — 전국 법원경매 통합검색

빌드 도구 없이 돌아가는 순수 HTML/CSS/JS 사이트입니다. `index.html` 을 더블클릭하면 바로 열립니다.

> **중요** — 지금 화면에 나오는 물건은 전부 **기능 시연용 샘플 데이터**입니다.
> 실제 법원경매 물건·주소·금액이 아니고, 입찰 판단에 쓰면 안 됩니다.
> 실제 물건은 [법원경매정보](https://www.courtauction.go.kr) 에서 확인하세요.

---

## 1. 내 PC로 가져오기

**방법 A — 깃으로 (업데이트 받기 편함)**

```bash
cd %USERPROFILE%\Desktop
git clone -b claude/confident-cannon-e7aa05 <이 저장소 주소> 진헌스캔
cd 진헌스캔\jinheonscan
start index.html
```

**방법 B — ZIP 다운로드**

GitHub 저장소 → 브랜치를 `claude/confident-cannon-e7aa05` 로 바꾸고 → `Code ▾` → `Download ZIP`
→ 압축 풀고 `jinheonscan` 폴더만 `C:\Users\진헌\Desktop\진헌스캔` 으로 옮기면 됩니다.

---

## 2. 파일 구조

| 파일 | 역할 |
|---|---|
| `index.html` | 화면 구조 (헤더 · 검색바 · 필터 · 결과 · 모달) |
| `app.css` | 전체 스타일, 반응형(데스크톱/모바일) |
| `data.js` | 지역·법원·물건종류 마스터 + **샘플 물건 생성기** |
| `api.js` | **데이터 어댑터** — 실데이터 연동은 여기만 고치면 됩니다 |
| `app.js` | 검색·정렬·페이징·관심물건·CSV·상세모달 로직 |

---

## 3. 들어있는 기능

**검색 조건**
- 키워드(소재지·단지명·법원·종류), 사건번호
- 시/도 → 시/군/구 (다중 선택), 관할 법원
- 물건 종류 20종 (주거용 / 상업용 / 산업용 / 토지 / 기타)
- 감정가·최저가 범위(만원), 최저가율(%) 범위, 유찰 횟수 범위
- 매각기일 기간 (7일 / 14일 / 30일 프리셋)
- 면적 범위 — ㎡ ↔ 평 전환 (입력값도 같이 환산)
- 특수권리 14종 (유치권·지분매각·선순위임차인·맹지 등), **특수권리 없는 물건만** 필터
- 진행 상태 (신건·진행·유찰·변경·매각·취하·정지)
- 빠른칩 7종 — 아파트만 / 2회 이상 유찰 / 최저가율 70% 이하 / 특수권리 없음 / 7일 내 기일 / 최저가 1억 이하 / 서울

**결과**
- 표 ↔ 카드 보기 전환 (좁은 화면은 카드가 기본)
- 정렬 9종 (매각기일 임박순이 기본 — 남은 기일이 가까운 것부터)
- 20 / 50 / 100개씩, 페이지네이션
- 요약 통계 5종 (건수 · 평균 최저가율 · 평균 유찰 · 신건 · 7일 내 기일)
- 적용된 조건이 칩으로 표시되고, 칩의 ✕ 로 하나씩 해제
- 검색 조건이 **주소창(URL)에 그대로 반영** → 링크만 보내면 같은 검색 결과가 열림
- 엑셀(CSV) 내보내기 — 현재 검색 결과 전체 (최대 5,000건, 한글 깨짐 없음)

**상세**
- 기일 내역 타임라인 (유찰될 때마다 저감된 금액)
- 입찰보증금(최저가 10%), 배당요구종기, 법원별 저감율(20%/30%)
- 예상 수익 계산기 — 입찰가·시세·수리비·명도비 입력 → 취득세·법무비·중개수수료·총투입·수익률
- 네이버 지도 / 카카오맵 / 법원경매정보 바로가기, 주소 복사
- 관심물건 ★ (브라우저에만 저장, 서버 전송 없음)

---

## 4. 인터넷에 올리기

**Vercel** (제일 간단, 무료)
1. [vercel.com](https://vercel.com) 가입 → `Add New... → Project`
2. 이 저장소 연결 → **Root Directory** 를 `jinheonscan` 으로 지정
3. Framework Preset `Other`, 빌드 명령 비움 → Deploy

**GitHub Pages**
저장소 Settings → Pages → 브랜치 선택 → 주소는 `https://<계정>.github.io/<저장소>/jinheonscan/`

---

## 5. 실제 경매 데이터 붙이기

화면 코드(`app.js`)는 `JHS_API` 만 호출합니다. 백엔드가 준비되면 `api.js` 위쪽만 바꾸세요.

```js
var CONFIG = {
  mode: 'remote',                          // 'sample' → 'remote'
  endpoint: 'https://내서버주소/api',       // POST /search, GET /item/:id
  ...
};
```

서버가 돌려줘야 하는 응답 모양:

```jsonc
// POST /search  (요청 본문 = 검색 조건 객체)
{
  "items": [ /* 물건 객체 배열 — data.js 의 필드 구조와 동일 */ ],
  "total": 1234,
  "stats": { "total": 1234, "avgRate": 73.6, "avgFail": 1.33, "newCount": 786, "soon": 137 }
}
```

물건 객체 필드는 `data.js` 의 `makeItem()` 반환값을 그대로 보면 됩니다
(`caseNo`, `court`, `type`, `sido`, `sigungu`, `address`, `buildingArea`, `landArea`,
`appraisal`, `minPrice`, `rate`, `failCount`, `saleDate`, `status`, `tags`, `history` …).

> 참고: 대법원 법원경매정보는 공개 API를 제공하지 않습니다. 실데이터를 쓰려면
> 유료 경매정보 제공사의 API를 계약하거나, 별도 수집 서버를 두고 이용약관을 확인해야 합니다.

---

## 6. 자주 바꿀 만한 곳

| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 색상·로고 | `app.css` 맨 위 `:root` 변수, `index.html` 헤더 SVG |
| 샘플 물건 수 | `api.js` 의 `CONFIG.sampleCount` (기본 2,400) |
| 샘플 물건 내용 | `data.js` 의 `TYPE_SPEC`, `PRICE_MULT`, `TAG_RULES` |
| 빠른칩 조건 | `app.js` 의 `QUICK` 객체 + `index.html` 의 `#quickChips` |
| 수익 계산 기준 | `app.js` `openDetail()` 안의 `calc()` (취득세율·법무비·중개수수료) |
