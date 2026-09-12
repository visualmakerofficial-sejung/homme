import { useCallback, useEffect, useState } from "react"

import type { RecentSearch } from "./types"

const STORAGE_KEY = "geotuscan:recent-searches"
const MAX_ITEMS = 20

/** 스냅샷에 남아 있던 실제 항목 하나를 시드로 둔다. */
const SEED: RecentSearch[] = [
  {
    id: "2025-506797(1)",
    label: "2025-506797(1)",
    mode: "case",
    address: "인천광역시 연수구 새말로 154",
    price: 130_200_000,
    date: "2025-08-31",
  },
]

function read(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentSearch[]) : SEED
  } catch {
    return SEED
  }
}

/**
 * 최근 검색 목록. 원본은 서버 저장이겠지만 스냅샷만으로는 알 수 없어
 * localStorage로 동일한 동작(추가·개별 삭제·전체 삭제)을 재현했다.
 */
export function useRecentSearches() {
  const [items, setItems] = useState<RecentSearch[]>(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* 사파리 프라이빗 모드 등에서 조용히 무시 */
    }
  }, [items])

  const add = useCallback((item: RecentSearch) => {
    setItems((prev) =>
      [item, ...prev.filter((p) => p.id !== item.id)].slice(0, MAX_ITEMS),
    )
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  return { items, add, remove, clear }
}
