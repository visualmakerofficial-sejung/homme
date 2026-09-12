import {
  Building2,
  ChartColumn,
  Database,
  House,
  Search,
  Target,
  type LucideIcon,
} from "lucide-react"

export type TabId =
  | "auction-search"
  | "villa-data"
  | "profitable"
  | "ai-review"
  | "apt-competition"
  | "villa-competition"

export interface TabItem {
  id: TabId
  label: string
  icon: LucideIcon
}

/** 원본 TabNav의 6개 탭. 순서·라벨·아이콘 모두 스냅샷과 동일하다. */
export const TABS: TabItem[] = [
  { id: "auction-search", label: "경매검색", icon: Search },
  { id: "villa-data", label: "빌라데이터", icon: Database },
  { id: "profitable", label: "돈되는부동산", icon: Building2 },
  { id: "ai-review", label: "AI복기", icon: Target },
  { id: "apt-competition", label: "아파트경쟁률", icon: ChartColumn },
  { id: "villa-competition", label: "빌라경쟁률", icon: House },
]
