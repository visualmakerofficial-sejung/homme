# KUK — 빅사이즈 유니섹스 스트릿 (Next.js)

`KUK.dc.html` 디자인 핸드오프를 **Next.js (App Router) + TypeScript** 로 재구현한 메인(홈) 페이지입니다. 흑백 모노톤 · 박시(oversized) · 빅사이즈(상의 XL~6XL, 하의 34~44 inch) 컨셉의 디자인 토큰·레이아웃·인터랙션을 그대로 옮겼습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # 프로덕션
```

## 구조

```
app/
  layout.tsx        # 폰트(Anton via next/font, Pretendard CDN), 메타데이터
  page.tsx          # 섹션 조립 + --accent 테마 변수 주입
  globals.css       # 리셋, 마퀴 keyframe, hover 반전, 반응형(≤768px)
components/
  AnnouncementBar / Header / Hero / Marquee / CategoryGrid
  ProductSection / ProductCard   # NEW·BEST 공용 (랭킹/태그 토글)
  BrandStatement / Lookbook / SizeFinder / Footer
  Logo / ImageSlot               # 워드마크 · 이미지 슬롯 플레이스홀더
lib/
  data.ts           # categories / newProducts / bestProducts / lookbook /
                    # heroModels / 사이즈 칩 + 테마 옵션
```

## 테마 옵션 (Tweakable props)

`lib/data.ts` 의 `theme` 에서 조정합니다.

- `accent`: `#0B0B0B`(기본) / `#E0431E` / `#1D4ED8` / `#117A4B`
  — eyebrow 색, 사이즈 파인더 배경, 베스트 랭킹 배지, 주요 버튼 hover 에 사용.
- `showMarquee`: 마퀴 표시 여부.
- `showRanking`: 베스트 랭킹 번호 배지 표시 여부.

## 구현 메모

- **플레이스홀더**: 원본의 드래그&드롭 이미지 슬롯(`<x-import image-slot>`)은 `ImageSlot` 으로 대체했습니다. 실제 운영 시 이 자리에 상품/AI 모델 컷(`next/image`)을 연결하세요.
- **로고**: 브랜드 벡터 자산 미제공이라 임팩트 있는 `Anton` 폰트 워드마크(`Logo`)로 대체했습니다. 최종 로고 벡터로 교체하세요.
- **데이터**: `lib/data.ts` 의 정적 배열은 운영 시 CMS / 상품 API fetch 로 교체합니다.
- **반응형**: 데스크탑 우선. ≤768px 에서 상품 그리드 2열, 히어로 라인업 4열 2행, 룩북 1열, 메인 내비 숨김.
