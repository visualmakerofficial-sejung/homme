# 거투스캔 경매검색 화면 클론

`거투스캔 - 경매 분석 프로그램.html` (원본: `https://geotuscan-app.vercel.app/auction-search` 의
"페이지 저장" 스냅샷) 을 분석해 React + TypeScript + Tailwind CSS v4로 재구현한 결과물.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run preview
```

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

원본 색을 넣으려면 `진헌스캔` 폴더의
`거투스캔 - 경매 분석 프로그램_files/` 안에 있는 CSS 두 개에서 `--primary`, `--card`,
`--muted` … 값을 찾아 `src/index.css`의 두 블록만 교체하면 된다. 나머지는 전부 토큰 참조라 따라온다.

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

---

## 7. 스냅샷에 없어서 새로 만든 것

정직하게 구분해 둔다.

| 항목 | 상태 |
| --- | --- |
| 경매검색 탭 (검색 카드 + 최근 검색) | 스냅샷에 있음 → 그대로 복제 |
| 나머지 5개 탭 | 스냅샷에 없음 → 빈 상태 카드 (`ComingSoonPage`) |
| 아파트 계산기 / 입찰계산기 / DSR | 다이얼로그가 닫힌 상태라 내부 미상 → 공개 산식으로 재구성, 실제 동작함 |
| 알림 / 문의 / 참고 사이트 | 동일 → 예시 데이터로 채움 |
| 최근 검색 저장소 | 원본은 서버일 것 → `localStorage`로 동일 동작(추가/개별삭제/전체삭제) 재현 |
| 검색 실행 | 조회 API 없음 → 최근 검색 추가 + 토스트까지만 |
| 로고 | `geotu-logo.png` 미포함 → `public/geotu-logo.svg` 임시 워드마크. 원본 PNG로 교체 필요 |

원본 RSC 페이로드에 박혀 있던 세션 값(`추진헌` / `01087717357` / `2026-10-01`)은
`src/App.tsx`의 `MEMBER` 상수로 옮겼다.

터치 기기에서는 hover가 없어 삭제 버튼이 영영 안 보이는 문제가 있어
`[@media(hover:none)]:opacity-100`을 하나 더 붙였다. 원본 대비 유일한 동작 변경점이다.

---

## 8. 구조

```
src/
├─ App.tsx                     (tabs) 레이아웃 + 탭 상태
├─ index.css                   디자인 토큰 / 커스텀 유틸  ← 색상 교체 지점
├─ data/nav.ts                 6개 탭 정의
├─ lib/
│  ├─ utils.ts                 cn()
│  └─ format.ts                한국식 금액 축약, 사건번호 조립
├─ components/
│  ├─ ui/                      button card input badge select dialog dropdown-menu
│  ├─ layout/                  Header TabNav(+MobileTabBar) ExternalLinksFab
│  └─ dialogs/                 CalculatorDialogs MiscDialogs
└─ features/
   ├─ auction-search/          AuctionSearchPage SearchCard RecentSearches useRecentSearches
   └─ ComingSoonPage.tsx
```
