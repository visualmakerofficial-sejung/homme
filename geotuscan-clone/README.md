# 거투스캔 클론

`geotuscan-app.vercel.app` 의 "페이지 저장" 스냅샷들을 분석해
React + TypeScript + Tailwind CSS v4로 재구현한 결과물.

받은 스냅샷 → 구현 상태:

| 화면 | 원본 경로 | 상태 |
| --- | --- | --- |
| 경매검색 | `/auction-search` | 복제 완료 |
| 빌라데이터 | `/villa-data` | 복제 완료 |
| 돈되는부동산 | `/apt-deals` | 복제 완료 |
| AI복기 | `/ai-review` | 복제 완료 |
| 아파트경쟁률 | `/apt-stats` | 복제 완료 |
| 빌라경쟁률 | `/villa-stats` | 복제 완료 |
| 유찰알림 (헤더 종 아이콘) | 다이얼로그 | 복제 완료 |
| 입찰계산기 (헤더) | 전체화면 오버레이 | 복제 완료 (산식 역산 검증) |
| 아파트 계산기 · DSR (헤더) | — | **스냅샷 없음** → 산식 재구성, 겉모습은 입찰계산기 규칙에 맞춤 |

`/apt-stats`와 `/villa-stats`는 Base UI가 붙이는 랜덤 id를 지우고 diff하면
제목·아이콘·부제 말고 차이가 없어서 `StatsPage` 하나를 공유한다.

```bash
npm install
npm run dev         # http://localhost:5173
npm run build       # dist/ 로 빌드 (루트 경로 기준)
npm run preview

npm run build:pages # 리포 루트의 geotuscan/ 로 빌드 (GitHub Pages 배포용)
```

## 라이브

<https://claude.ai/code/artifact/9340c183-3cf6-4ecc-a34d-ed68782fb2e8>

Claude Artifact로 호스팅했다. 기본은 비공개이고, 페이지의 공유 메뉴에서 링크를 열 수 있다.
갱신하려면 `npm run build:artifact` 로 빌드해 (`dist-artifact/`)
`index.html` 대신 아래 형태의 페이지와 `assets/`를 함께 올린다 (아티팩트는
`<html>/<head>/<body>` 없이 본문만 받는다).

```html
<title>거투스캔</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist...&family=Noto+Sans+KR..." />
<link rel="stylesheet" href="assets/<해시>.css" />
<div id="root"></div>
<script type="module" src="assets/<해시>.js"></script>
```

폰트가 다른 이유: 아티팩트 CSP는 스타일시트를 `fonts.googleapis.com`에서만 받는다.
그래서 jsDelivr의 Pretendard가 차단되고 Noto Sans KR로 폴백된다.
`--font-sans`에 둘 다 넣어 뒀으므로 일반 호스트에서는 Pretendard가 그대로 쓰인다.

## 개인정보

원본 스냅샷의 RSC 페이로드에는 **실제 회원 이름과 휴대폰 번호**가 그대로 들어 있었다.
공개 저장소와 호스팅에 올릴 값이 아니라 `src/App.tsx`의 `MEMBER`를 데모값으로 바꿨다.
실제 인증을 붙일 때 세션에서 받아오면 된다.

## GitHub Pages (참고)

`.github/workflows/static.yml`이 **main 푸시 시 리포 루트 전체**를 GitHub Pages로 올린다.
그래서 빌드 산출물을 리포 루트 `geotuscan/`에 커밋해 두는 방식으로 붙였다.

```bash
npm run build:pages   # BASE_PATH=/homme/geotuscan/ OUT_DIR=../geotuscan
git add ../geotuscan && git commit && git push
```

소스를 고쳤으면 `build:pages`를 다시 돌려 `geotuscan/`을 갱신해야 한다 (자동 빌드 아님).

### ⚠ Pages 워크플로가 한 번도 성공한 적이 없다

`static.yml`은 2026-06-19 첫 실행부터 **19회 전부 실패**했다 (이 클론과 무관하게
그 전부터). 매번 2~5초 만에 로그도 없이 끝나는데, 이는 `github-pages` 환경이
없어서 잡이 시작 직후 거부될 때 나오는 형태다.

원인은 저장소 설정일 가능성이 높다:

> Settings → Pages → Build and deployment → **Source 를 "GitHub Actions" 로**

현재 Source가 "Deploy from a branch"라면 사이트 자체는 main 루트에서 서비스되고
있을 것이고(그러면 `/geotuscan/`도 자동으로 함께 올라간다), 이 워크플로는
계속 실패만 하는 잔재다. Source가 아예 꺼져 있다면 아무것도 서비스되지 않는다.
둘 중 어느 쪽인지는 저장소 설정 화면에서 확인해야 한다.

---

## 1. 원본 스택 분석

스냅샷 마크업에서 확인한 내용이다.

| 항목 | 원본 | 클론 |
| --- | --- | --- |
| 프레임워크 | Next.js App Router (RSC 페이로드 `self.__next_f`) | React 19 + Vite |
| 스타일 | Tailwind CSS v4 (`data-*` 변형, `in-*`, `has-*`, `*:` 변형) | 동일 |
| 컴포넌트 | shadcn/ui 계열 (`data-slot="button|card|input|select-trigger|badge"`) | 동일 구조로 재작성 |
| 프리미티브 | Base UI (`data-base-ui-click-trigger`, `id="base-ui-_R_…"`) | Radix UI |
| 아이콘 | lucide (`lucide-search`, `lucide-chart-column`, `lucide-house` …) | `lucide-react` |
| 토스트 | sonner (`[data-sonner-toaster]` 스타일 인라인 주입) | `sonner` |
| 폰트 | Geist / Geist Mono (next/font CSS 모듈) + Pretendard (jsDelivr) | 동일 |

> Base UI 대신 Radix를 쓴 이유: 동일한 `data-state` / `data-placeholder` 계약을 가져서
> 원본 클래스 문자열을 한 글자도 안 고치고 그대로 쓸 수 있고, 생태계가 더 넓다.

---

## 2. 레이아웃

원본 RSC 페이로드에 들어 있던 `(tabs)` 레이아웃 트리를 그대로 옮겼다.

```
div.min-h-screen.flex.flex-col
├─ Header            h-14 border-b bg-card flex items-center justify-between px-4
├─ TabNav            hidden md:block border-b bg-card      → 데스크톱 6탭
├─ MobileTabBar      md:hidden fixed bottom-0 z-50 …       → 모바일 6탭
├─ main              flex-1 p-4 pb-20 md:pb-4 max-w-5xl mx-auto w-full
└─ ExternalLinks     fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40  (FAB)
```

핵심 디테일:

- `main`의 `pb-20`은 모바일 하단 탭바가 콘텐츠를 가리지 않게 하는 여백이고, `md:pb-4`로 되돌린다.
- 데스크톱 활성 탭 인디케이터는 `absolute bottom-0 left-3 right-3 h-0.5` — 라벨보다 좌우 12px 좁다.
- 모바일 활성 탭 인디케이터는 같은 요소가 `top-0 left-4 right-4`로 **위쪽**에 붙는다.
- 모바일 탭바는 `bg-card/95 backdrop-blur-sm` + `safe-area-bottom`(= `env(safe-area-inset-bottom)`).
- 헤더 액션 라벨은 `hidden sm:inline`으로 640px 미만에서 사라지고 아이콘만 남는다.

---

## 3. 색상 — 확인 필요

**원본 팔레트는 복원하지 못했다.** 저장된 HTML은 CSS를 외부 파일
(`34d933785a17edf3.css`, `d34f76c7183e71bc.css`)로 참조만 하고 있고, 그 파일들은
업로드된 스냅샷에 포함돼 있지 않다. 마크업에는 `bg-primary`, `text-muted-foreground` 같은
**토큰 이름만** 있고 raw 값이 하나도 없다.

그래서 `src/index.css`의 `:root` / `.dark` 블록은 shadcn 뉴트럴 베이스에
블루 프라이머리(`oklch(0.546 0.198 262.9)` ≈ `#2563eb`)를 얹어 채워 뒀다. **여기서부턴 추측이다.**

### 원본 색으로 교체하는 법

로컬 `진헌스캔` 폴더 안 `거투스캔 - 경매 분석 프로그램_files/` 에 그 CSS가 들어 있다.
추출 스크립트를 붙여 뒀으니 경로만 넘기면 된다.

```bash
# 미리보기 (붙여넣을 블록을 출력만)
node scripts/extract-theme.mjs "…/거투스캔 - 경매 분석 프로그램_files"

# 바로 적용 (src/index.css의 :root / .dark 블록을 교체)
node scripts/extract-theme.mjs "…/거투스캔 - 경매 분석 프로그램_files" --write
```

개별 파일 경로를 여러 개 넘겨도 되고, 원본에서 못 찾은 토큰은 현재 값을 그대로 유지한다.
색상은 전부 이 두 블록을 참조하므로 버튼·카드·뱃지·토스트까지 한 번에 따라온다.

확인된 토큰 이름 (원본 마크업에서 실제로 쓰이는 것):

```
background  foreground  card  card-foreground  popover  primary  primary-foreground
muted  muted-foreground  accent  destructive  border  input  ring
--radius-md (rounded-[min(var(--radius-md),12px)] 에서 참조)
```

---

## 4. 폰트

```
--font-sans: "Geist", "Pretendard", ui-sans-serif, system-ui, …
--font-mono: "Geist Mono", ui-monospace, …
```

원본 `<body>`에 `geist_…__variable` 클래스가 붙어 있고 `<head>`에서 Pretendard를 따로 로드한다.
Geist에는 한글 글리프가 없어서 **라틴/숫자는 Geist, 한글은 Pretendard**로 자동 폴백되는 구조다.
그 순서를 그대로 유지했다. `index.html`에서 Google Fonts(Geist) + jsDelivr(Pretendard)를 받는다.

---

## 5. 애니메이션 / 인터랙션

원본 클래스에서 추출한 모션이다. 전부 그대로 살렸다.

| 대상 | 동작 |
| --- | --- |
| 모든 버튼 | `transition-all` + `active:translate-y-px` (누르면 1px 내려감) |
| 토스트 | sonner. `--normal-bg` 등을 디자인 토큰에 연결해 팔레트를 같이 따라간다 |
| ghost 버튼 | `hover:bg-muted hover:text-foreground`, `aria-expanded:bg-muted` (열림 상태 유지) |
| 포커스 링 | `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` |
| FAB | `transition-transform hover:scale-105 active:scale-95` |
| 최근 검색 삭제 버튼 | `opacity-0 group-hover:opacity-100 transition-opacity` |
| 모바일 탭 | `active:text-primary/70` |
| 탭 전환 | `transition-colors` |
| 세그먼트 토글 | 활성 쪽 `bg-background shadow-sm` |
| Select / Dropdown / Dialog | `data-[state=open]:animate-in fade-in-0 zoom-in-95` + side별 slide (tw-animate-css) |
| `body` | `transition: opacity .2s ease-in` (원본 `<head>` 인라인 스타일) |

원본의 커스텀 유틸 두 개도 재현했다 (CSS가 없어 동작으로 역추론):

- `.price-text` — 금액 표기. `tabular-nums`로 자릿수 흔들림 방지.
- `.gs-reveal` — 스크롤 리빌. 원본은 `<noscript>`에서 `opacity:1!important`로 무력화한다.
  여기서는 `prefers-reduced-motion`에도 같은 처리를 넣었다.

---

## 6. UI 컴포넌트

`src/components/ui/` — 원본 마크업의 클래스 문자열을 **그대로** 옮겨 담은 shadcn 계열 컴포넌트.

- `button.tsx` — `default` / `ghost` / `outline` / `destructive` / `link`, 크기 `default|sm|xs|icon`.
  ghost의 `rounded-[min(var(--radius-md),12px)]`, default의 `rounded-lg` 차이까지 원본 그대로.
- `card.tsx` — `border`가 아니라 `ring-1 ring-foreground/10`으로 테두리를 그린다. `data-size="sm"` 지원.
- `input.tsx` — `text-base` → `md:text-sm` (모바일 자동 확대 방지).
- `badge.tsx` — `rounded-4xl` 캡슐, `[&>svg]:size-3!`.
- `select.tsx` / `dropdown-menu.tsx` / `dialog.tsx` — Radix 기반.
- `switch.tsx` — 유찰알림의 on/off 스위치. Radix Switch가 아니라 원본처럼
  버튼 + 절대배치 노브(트랙 w-11 h-6 / 노브 w-5 h-5 → translate-x-5)로 만들었다.
- `filter-pill.tsx` — 통계/목록 화면의 알약 필터. 기본 `px-2.5 py-1 text-xs`,
  정렬용 작은형 `px-2 py-1 text-[11px]`.
- `segmented.tsx` — `bg-muted` 트랙 세그먼트 토글. 경매검색(사건번호/주소)과
  AI복기(차익/정확도)가 같은 마크업이라 하나로 합쳤다.
- `checkbox-filter.tsx` — 원본이 shadcn Checkbox 대신 네이티브 input + `accent-*`를
  쓰기에 그대로 따랐다. 강조색이 항목마다 다르다(primary/emerald/amber/sky/lime/violet).

### 헤더 오버레이 두 종류

원본은 헤더에서 여는 것들의 형태가 서로 다르다.

- **유찰알림**: 진짜 다이얼로그. `bg-background` / `sm:max-w-lg` / `max-h-[85vh]`,
  닫기 버튼은 ghost 버튼 `size-7`을 `absolute top-2 right-2`에 둔다.
  이름은 "알림"이지만 공지 목록이 아니라 **알림 조건 설정** 화면이다.
- **입찰계산기**: 다이얼로그가 아니라 `fixed inset-0 z-50 bg-background overflow-y-auto`
  **전체화면 오버레이** + sticky 헤더. 금액 단위가 전부 만원이고
  기본값은 수리비 300 / 기타비용 50 / 대출 80% / 금리 4.5% / 5개월이다.
  모드에 따라 입력이 달라진다 — 빌라/도생은 취득세를 1.1%로 자동 산정하고
  "기대수익으로 입찰가 역산"이 붙고, 아파트는 취득세를 직접 입력받는다.

#### 입찰계산기 산식 (역산으로 확인)

값이 채워진 스냅샷(감정가 9100 / 입찰가 5818 / 매도 9000 / 수리비 800 / 명도 0 /
기타 50 / 대출 80% / 4.5% / 5개월)의 결과 12개 항목을 맞춰 본 결과다.
`src/lib/bid-calc.ts`에 그대로 들어 있다.

| 항목 | 산식 | 원본 |
| --- | --- | --- |
| 낙찰가율 | 입찰가 ÷ 감정가 | 63.9% |
| 취득세 | 입찰가 × 1.1% (빌라 모드 자동) | 64만 |
| 중개비 | 매도예상가 × 0.7% | 63만 |
| 이자 | 대출금 × 금리 × 개월/12 | 87만 |
| 총 제비용 | 취득세+중개비+이자+수리비+명도비+기타 | 1,064만 |
| 예상 소득금액 | 매도예상가 − 입찰가 − 총 제비용 | 2,118만 |
| 종합소득세 | 소득 × 기본세율 − 누진공제 (1,400~5,000만 → 15% / 126만) | 192만 |
| 지방소득세 | 종합소득세 × 10% | 19만 |
| 순수이익 | 소득 − 종소세 − 지방세 | +1,907만 |
| 대출가능금액 | 입찰가 × 대출비율 | 4,654만 |
| 투자필요금 | 입찰가 − 대출금 + 총 제비용 | 2,228만 |
| 예상 수익률 | 순수이익 ÷ 투자필요금 | +85.6% |

"기대수익으로 입찰가 역산"은 원본 구현 방식을 알 수 없어 이분탐색으로 풀었다
(입찰가가 오르면 순수이익이 단조 감소하므로 해가 하나다). 위 입력으로 역산하면
원본과 같은 5818이 나온다.

### 원본이 공용 컴포넌트를 안 쓴 자리

AI복기의 검색 input과 "찾기" 버튼, 입찰계산기의 모든 입력칸은 원본에서
`Input`/`Button`을 거치지 않고 클래스를 직접 박아 뒀다(`h-7`/`h-9` + `focus:ring-1`).
그 불일치도 그대로 옮겼다.

빌라데이터의 "거래량 TOP 20 동네 보기" 버튼만 토큰이 아니라
`from-blue-500 to-indigo-500` 그라데이션을 직접 쓴다. 팔레트를 교체해도
이 버튼 색은 안 따라온다 — 원본이 그렇게 돼 있다.

셀렉트 트리거는 원본이 전부 `w-fit`이라 `grid-cols-2` 안에서도 칸을 채우지 않고
내용 너비로 남는다. 레이아웃 버그처럼 보이지만 스냅샷이 그렇게 돼 있어 손대지 않았다.

---

## 7. 스냅샷에 없어서 새로 만든 것

정직하게 구분해 둔다.

| 항목 | 상태 |
| --- | --- |
| 6개 탭 전부 + 유찰알림 + 입찰계산기 | 스냅샷에 있음 → 그대로 복제 |
| 시도·시군구 목록 | 원본은 API로 받는 듯 → 표준 행정구역을 정적으로 넣음 (`src/data/regions.ts`) |
| 빌라데이터 3번째 셀렉트 | 라벨이 안 나옴 → "읍면동"으로 추정 |
| 지역 랭킹 TOP 10 | 접힌 상태만 캡처됨 → 펼침 동작만 구현, 내용은 빈 상태 |
| 각 화면 결과 목록 | 전부 "선택해주세요"/"데이터 없음" 상태로 캡처됨 → 목록 렌더링은 없음 |
| 입찰계산기 역산 블록 노출 조건 | 스냅샷 2장이 모드·입력상태가 동시에 달라 "빌라 전용"인지 "매도예상가 입력 시"인지 구분 불가 → 관찰된 조합대로 빌라 전용 |
| 아파트 계산기 / DSR | 스냅샷 없음 → 공개 산식으로 재구성, 실제 동작함. 겉모습은 확인된 입찰계산기 규칙(전체화면 / 만원 / 결과 카드)을 따랐으나 원본이 그 형태인지는 미확인 |
| 문의 / 참고 사이트 | 스냅샷 없음 → 예시 데이터로 채움 |
| 최근 검색 저장소 | 원본은 서버일 것 → `localStorage`로 동일 동작(추가/개별삭제/전체삭제) 재현 |
| 검색 실행 | 조회 API 없음 → 최근 검색 추가 + 토스트까지만 |
| 로고 | `geotu-logo.png` 미포함 → `public/geotu-logo.svg` 임시 워드마크(currentColor). 원본 PNG로 교체 필요 |

원본 RSC 페이로드에 박혀 있던 세션 값(`추진헌` / `01087717357` / `2026-10-01`)은
`src/App.tsx`의 `MEMBER` 상수로 옮겼다.

### 다크 모드

원본 헤더에는 테마 토글이 없고 스냅샷의 `<html>`에도 `class="dark"`가 없다.
반면 마크업 전반에는 `dark:` 변형이 깔려 있다. 둘 중 뭐가 원본 동작인지 단정할 수 없어서
**눈에 보이는 증거(라이트 화면)** 를 따라 `src/lib/theme.ts`의 `THEME_MODE = "light"`로 고정했다.
`"system"`으로 바꾸면 OS 설정을 따라가고 `.dark` 팔레트가 살아난다. UI에 토글은 넣지 않았다
(원본 헤더는 액션 5개 + 아바타가 전부라, 하나 더 붙이면 그 자체가 차이가 된다).

### 원본과 다른 점

터치 기기에서는 hover가 없어 최근 검색 삭제 버튼이 영영 안 보인다.
`[@media(hover:none)]:opacity-100`을 하나 더 붙였다. 의도적으로 둔 유일한 동작 차이다.

---

## 8. 구조

```
scripts/extract-theme.mjs      원본 CSS → 디자인 토큰 추출
src/
├─ App.tsx                     (tabs) 레이아웃 + 탭 → 화면 매핑
├─ index.css                   디자인 토큰 / 커스텀 유틸  ← 색상 교체 지점
├─ data/
│  ├─ nav.ts                   6개 탭 정의
│  └─ regions.ts               시도·시군구, 월 옵션
├─ lib/
│  ├─ utils.ts                 cn()
│  ├─ format.ts                한국식 금액 축약, 사건번호 조립
│  └─ theme.ts                 라이트/다크 모드 결정  ← THEME_MODE
├─ components/
│  ├─ ui/                      button card input badge select dialog dropdown-menu
│  │                           sonner filter-pill segmented checkbox-filter
│  ├─ layout/                  Header TabNav(+MobileTabBar) ExternalLinksFab PageHeader
│  └─ dialogs/                 CalculatorDialogs MiscDialogs
└─ features/
   ├─ auction-search/          AuctionSearchPage SearchCard RecentSearches useRecentSearches
   ├─ apt-deals/               AptDealsPage          (돈되는부동산)
   ├─ ai-review/               AiReviewPage          (AI복기)
   ├─ stats/                   StatsPage             (아파트·빌라 경쟁률 공용)
   └─ villa-data/              VillaDataPage         (빌라데이터)
```

계산기 3종은 `components/dialogs/calc-ui.tsx`의 공통 셸(`CalcPanel` / `CalcSection` /
`MoneyRow` / `ResultCard` …)을 함께 쓴다. 입찰계산기 스냅샷에서 확인한 규칙이다.

## 9. 확인한 것

`npm run build` 통과. Chromium(Playwright)으로 실제 렌더링과 동작을 확인했다.

- 320 / 390 / 1280px 전부 가로 스크롤 없음 (새로 붙인 4개 탭 포함)
- 연도 선택 → 타경번호 입력 → 검색 → 토스트 + 최근 검색 추가 → 전체 삭제 → 빈 상태
- 시도 선택 → 시군구 셀렉트 활성화 및 목록 갱신 → 안내 문구 전환
- 지역 랭킹 카드 펼침/접힘, 알약 필터·세그먼트·체크박스 선택 상태
- 빌라데이터 3단 셀렉트 연쇄(시도 선택 전 시군구·읍면동 disabled), 지표 탭 전환
- 유찰알림 스위치 토글, 관심지역/관심부동산 알약 다중선택
- 입찰계산기: 원본 스냅샷과 같은 입력을 넣어 결과 12개 항목이 전부 일치,
  역산이 원본 입찰가(5818)로 되돌아옴, 아파트 모드 전환 시 입력 구성 변화
- `build:pages` 산출물을 `/homme/geotuscan/` 경로에 올려 놓고 404·콘솔 에러 0 확인
- 탭 전환, 헤더 드롭다운, 다이얼로그 3종 열림/입력/계산
- 토스트 배경이 `var(--popover)`로 해석됨 (sonner 기본 회색이 아니라 토큰을 탐)
- 콘솔 에러 없음 (CDN 폰트 차단은 이 개발 컨테이너 한정)
