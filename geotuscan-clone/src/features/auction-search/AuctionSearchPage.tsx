import { toast } from "sonner"

import { formatCaseNo } from "@/lib/format"

import { RecentSearches } from "./RecentSearches"
import { SearchCard, type CaseQuery, type KeywordQuery } from "./SearchCard"
import type { RecentSearch } from "./types"
import { useRecentSearches } from "./useRecentSearches"

/**
 * 스냅샷이 담고 있는 실제 화면: 검색 카드 + 최근 검색 카드가
 * `space-y-4`로 쌓인 구조.
 */
export function AuctionSearchPage() {
  const { items, add, remove, clear } = useRecentSearches()

  function handleSearch(query: CaseQuery | KeywordQuery) {
    const entry: RecentSearch =
      query.mode === "case"
        ? {
            id: formatCaseNo(query.year, query.serial, query.item || undefined),
            label: formatCaseNo(
              query.year,
              query.serial,
              query.item || undefined,
            ),
            mode: "case",
            address: "조회 중…",
            price: 0,
            date: new Date().toISOString().slice(0, 10),
          }
        : {
            id: `kw:${query.keyword}`,
            label: query.keyword,
            mode: "keyword",
            address: "키워드 검색",
            price: 0,
            date: new Date().toISOString().slice(0, 10),
          }

    add(entry)
    // 실제 조회 API는 스냅샷에 없어서, 여기서는 접수만 알리고 끝낸다.
    toast(`${entry.label} 검색`, { description: "최근 검색에 추가했습니다." })
  }

  return (
    <div className="space-y-4">
      <SearchCard onSearch={handleSearch} />
      <RecentSearches
        items={items}
        onSelect={(item) =>
          toast(item.label, { description: item.address })
        }
        onRemove={remove}
        onClear={clear}
      />
    </div>
  )
}
