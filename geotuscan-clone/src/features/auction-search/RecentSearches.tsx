import { Clock, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatKoreanMoney, formatShortDate } from "@/lib/format"

import type { RecentSearch } from "./types"

interface RecentSearchesProps {
  items: RecentSearch[]
  onSelect: (item: RecentSearch) => void
  onRemove: (id: string) => void
  onClear: () => void
}

/**
 * 원본 "최근 검색" 카드.
 * 행 전체가 `group`이고 삭제 버튼은 `opacity-0 group-hover:opacity-100`으로
 * hover할 때만 드러난다 (터치 기기에서는 항상 보이도록 예외 처리).
 */
export function RecentSearches({
  items,
  onSelect,
  onRemove,
  onClear,
}: RecentSearchesProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            최근 검색
          </h3>
          <Button
            variant="ghost"
            size="xs"
            onClick={onClear}
            disabled={items.length === 0}
            className="text-muted-foreground"
          >
            전체 삭제
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            최근 검색 내역이 없습니다.
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelect(item)
                  }
                }}
                className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 text-[10px]"
                    >
                      {item.mode === "case" ? "사건" : "주소"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.address}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="price-text">
                      {formatKoreanMoney(item.price)}
                    </span>
                    <span>{formatShortDate(item.date)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`${item.label} 삭제`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(item.id)
                  }}
                  className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive [@media(hover:none)]:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
