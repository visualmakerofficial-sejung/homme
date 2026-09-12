export type SearchMode = "case" | "keyword"

export interface RecentSearch {
  id: string
  /** "2025-506797(1)" 또는 키워드 원문 */
  label: string
  mode: SearchMode
  address: string
  /** 최저매각가 (원) */
  price: number
  /** 매각기일 ISO date */
  date: string
}
