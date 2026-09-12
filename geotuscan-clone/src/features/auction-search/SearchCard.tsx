import { useState } from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { onlyDigits } from "@/lib/format"

import type { SearchMode } from "./types"

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 11 }, (_, i) => String(CURRENT_YEAR - i))

export interface CaseQuery {
  mode: "case"
  year: string
  serial: string
  item: string
}

export interface KeywordQuery {
  mode: "keyword"
  keyword: string
}

interface SearchCardProps {
  onSearch: (query: CaseQuery | KeywordQuery) => void
}

/**
 * 원본 검색 카드.
 * - 상단: bg-muted 트랙 위에 올라간 2분할 세그먼트 토글
 * - 하단: 연도(select) / 타경번호(input) / 물건(input) / 제출(icon button)
 *   `items-end`로 라벨 높이가 달라도 컨트롤 밑단이 맞는다.
 */
export function SearchCard({ onSearch }: SearchCardProps) {
  const [mode, setMode] = useState<SearchMode>("case")
  const [year, setYear] = useState("")
  const [serial, setSerial] = useState("")
  const [item, setItem] = useState("")
  const [keyword, setKeyword] = useState("")

  const canSubmitCase = year !== "" && serial.length > 0
  const canSubmitKeyword = keyword.trim().length > 0
  const canSubmit = mode === "case" ? canSubmitCase : canSubmitKeyword

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (mode === "case") {
      onSearch({ mode: "case", year, serial, item })
    } else {
      onSearch({ mode: "keyword", keyword: keyword.trim() })
    }
  }

  return (
    <Card className="overflow-visible">
      <CardContent className="space-y-3 pt-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "case", label: "사건번호" },
            { value: "keyword", label: "주소/키워드" },
          ]}
        />

        <form onSubmit={handleSubmit}>
          {mode === "case" ? (
            <div className="flex items-end gap-2">
              <div className="w-[100px] shrink-0">
                <label className="mb-1 block text-xs text-muted-foreground">
                  연도
                </label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="연도선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label
                  htmlFor="case-serial"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  타경 번호
                </label>
                <Input
                  id="case-serial"
                  placeholder="12345"
                  inputMode="numeric"
                  className="h-10"
                  value={serial}
                  onChange={(e) => setSerial(onlyDigits(e.target.value))}
                />
              </div>

              <div className="w-[70px] shrink-0">
                <label
                  htmlFor="case-item"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  물건
                </label>
                <Input
                  id="case-item"
                  placeholder="전체"
                  inputMode="numeric"
                  className="h-10"
                  value={item}
                  onChange={(e) => setItem(onlyDigits(e.target.value))}
                />
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                aria-label="검색"
                className="h-10 shrink-0 px-4"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label
                  htmlFor="keyword"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  주소 또는 키워드
                </label>
                <Input
                  id="keyword"
                  placeholder="인천 연수구 새말로"
                  className="h-10"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={!canSubmit}
                aria-label="검색"
                className="h-10 shrink-0 px-4"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
