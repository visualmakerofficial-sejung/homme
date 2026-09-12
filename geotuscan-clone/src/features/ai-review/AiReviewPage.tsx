import { useState } from "react"
import { Search } from "lucide-react"

import { EmptyCard, PageHeader } from "@/components/layout/PageHeader"
import { CheckboxFilter } from "@/components/ui/checkbox-filter"
import { FilterPill } from "@/components/ui/filter-pill"
import { Segmented } from "@/components/ui/segmented"

type View = "profit" | "accuracy"
type Period = "day" | "week" | "month"
type Kind = "all" | "apt" | "villa"
type Sort = "recent" | "profit" | "error"

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "하루" },
  { value: "week", label: "일주일" },
  { value: "month", label: "1달" },
]

const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "apt", label: "아파트" },
  { value: "villa", label: "빌라·도시형" },
]

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "최근순" },
  { value: "profit", label: "차익 큰순" },
  { value: "error", label: "오차 큰순" },
]

/**
 * AI복기 (/ai-review).
 *
 * 검색 입력과 찾기 버튼은 원본에서 공용 Input/Button 컴포넌트를 쓰지 않고
 * 클래스를 직접 박아 뒀다(h-9 / focus:ring-1). 그 불일치까지 그대로 옮겼다.
 * 기간·물건종류 알약은 `|` 구분자로 나뉜 별개 그룹이라 각각 하나씩 선택된다.
 */
export function AiReviewPage() {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<View>("profit")
  const [period, setPeriod] = useState<Period>("month")
  const [kind, setKind] = useState<Kind>("all")
  const [sort, setSort] = useState<Sort>("recent")
  const [highConfidence, setHighConfidence] = useState(false)
  const [excludeOutliers, setExcludeOutliers] = useState(true)

  return (
    <div className="space-y-4">
      <div>
        <PageHeader
          title="AI 복기"
          description="낙찰된 물건, AI 예측가 대비 얼마에 낙찰됐나"
        />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="지역·사건번호 검색 (예: 경기도 파주시)"
            aria-label="지역·사건번호 검색"
            className="h-9 w-full rounded-lg border pr-8 pl-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm text-primary-foreground"
        >
          <Search className="h-4 w-4" />
          찾기
        </button>
      </form>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: "profit", label: "💰 차익 보기" },
          { value: "accuracy", label: "🎯 정확도 보기" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => (
          <FilterPill
            key={p.value}
            active={period === p.value}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </FilterPill>
        ))}
        <span className="mx-1 text-muted-foreground/40">|</span>
        {KINDS.map((k) => (
          <FilterPill
            key={k.value}
            active={kind === k.value}
            onClick={() => setKind(k.value)}
          >
            {k.label}
          </FilterPill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <CheckboxFilter
          label="신뢰도 높음만"
          accent="accent-emerald-500"
          checked={highConfidence}
          onChange={(e) => setHighConfidence(e.target.checked)}
        />
        <CheckboxFilter
          label="이상치 제외"
          accent="accent-primary"
          checked={excludeOutliers}
          onChange={(e) => setExcludeOutliers(e.target.checked)}
        />
      </div>

      <div className="flex items-center gap-1.5">
        {SORTS.map((s) => (
          <FilterPill
            key={s.value}
            size="sm"
            active={sort === s.value}
            onClick={() => setSort(s.value)}
          >
            {s.label}
          </FilterPill>
        ))}
      </div>

      <EmptyCard variant="block">
        이 조건의 복기 데이터가 아직 없습니다.
      </EmptyCard>
    </div>
  )
}
