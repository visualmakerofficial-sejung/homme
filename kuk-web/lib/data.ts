// KUK 메인 페이지 데이터 소스
// 실제 운영 시 이 값들은 CMS / 상품 API에서 fetch 합니다.

export type Category = { en: string; kr: string };

export type Product = {
  slot: string;
  name: string;
  price: string;
  cat: "TOP" | "BTM";
  sizes: string;
  tag?: string;
  rank?: number;
};

export type Look = { slot: string; label: string; caption: string };

export type HeroModel = { slot: string; img: string; top: string; btm: string };

// 테마 옵션 (원본 프로토타입의 Tweakable props)
export const theme = {
  // 기본 #0B0B0B. 옵션: #0B0B0B / #E0431E / #1D4ED8 / #117A4B
  accent: "#0B0B0B",
  showMarquee: true,
  showRanking: true,
};

export const categories: Category[] = [
  { en: "OUTER", kr: "아우터" },
  { en: "TOP", kr: "상의" },
  { en: "BOTTOM", kr: "하의" },
  { en: "SET", kr: "셋업·세트" },
];

export const newProducts: Product[] = [
  { slot: "new-1", name: "헤비웨이트 오버핏 티셔츠", price: "₩39,000", cat: "TOP", sizes: "XL~6XL", tag: "NEW" },
  { slot: "new-2", name: "워싱 와이드 데님 팬츠", price: "₩69,000", cat: "BTM", sizes: "34~44", tag: "NEW" },
  { slot: "new-3", name: "박시 후드 집업", price: "₩89,000", cat: "TOP", sizes: "XL~5XL" },
  { slot: "new-4", name: "발마칸 오버 코트", price: "₩159,000", cat: "TOP", sizes: "XL~4XL", tag: "NEW" },
  { slot: "new-5", name: "럭비 카라 헤비 니트", price: "₩79,000", cat: "TOP", sizes: "XL~5XL" },
  { slot: "new-6", name: "투턱 와이드 슬랙스", price: "₩59,000", cat: "BTM", sizes: "34~44" },
  { slot: "new-7", name: "오버사이즈 맨투맨", price: "₩49,000", cat: "TOP", sizes: "XL~6XL", tag: "NEW" },
  { slot: "new-8", name: "카고 와이드 팬츠", price: "₩72,000", cat: "BTM", sizes: "34~44" },
];

export const bestProducts: Product[] = [
  { rank: 1, slot: "best-1", name: "헤비웨이트 오버핏 티셔츠", price: "₩39,000", cat: "TOP", sizes: "XL~6XL" },
  { rank: 2, slot: "best-2", name: "박시 후드 집업", price: "₩89,000", cat: "TOP", sizes: "XL~5XL" },
  { rank: 3, slot: "best-3", name: "투턱 와이드 슬랙스", price: "₩59,000", cat: "BTM", sizes: "34~44" },
  { rank: 4, slot: "best-4", name: "오버사이즈 맨투맨", price: "₩49,000", cat: "TOP", sizes: "XL~6XL" },
];

export const lookbook: Look[] = [
  { slot: "look-1", label: "VOL.01 / STREET", caption: "박시한 실루엣, 크게 벗다" },
  { slot: "look-2", label: "VOL.02 / UNISEX", caption: "성별 없는 빅사이즈" },
  { slot: "look-3", label: "VOL.03 / DAILY", caption: "매일 입는 편안한 큰 옷" },
];

export const topChips = ["XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
export const btmChips = ["34", "36", "38", "40", "42", "44"];

// 빅사이즈: 상의 XL부터, 하의 인치 별도
const heroSpec: { top: string; btm: string }[] = [
  { top: "XL", btm: "34" },
  { top: "XL", btm: "36" },
  { top: "2XL", btm: "36" },
  { top: "2XL", btm: "38" },
  { top: "3XL", btm: "40" },
  { top: "4XL", btm: "40" },
  { top: "5XL", btm: "42" },
  { top: "6XL", btm: "44" },
];

export const heroModels: HeroModel[] = heroSpec.map((s, i) => ({
  slot: `hero-${i + 1}`,
  img: `assets/model-${i + 1}.png`,
  top: s.top,
  btm: s.btm,
}));
