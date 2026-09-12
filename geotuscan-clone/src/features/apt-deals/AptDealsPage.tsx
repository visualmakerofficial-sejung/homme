import { useState } from "react"
import { Building2, House } from "lucide-react"

import { EmptyCard, PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { CheckboxFilter } from "@/components/ui/checkbox-filter"
import { FilterPill } from "@/components/ui/filter-pill"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SIDO, SIGUNGU, type Sido } from "@/data/regions"
import { cn } from "@/lib/utils"

type Kind = "apt" | "villa"
type PriceBand = "all" | "u1" | "1to2" | "2to3" | "3to5" | "o5"
type Sort = "profit" | "dueSoon" | "dueLate" | "area" | "density" | "absorption"

const PRICE_BANDS: { value: PriceBand; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "u1", label: "1억미만" },
  { value: "1to2", label: "1~2억" },
  { value: "2to3", label: "2~3억" },
  { value: "3to5", label: "3~5억" },
  { value: "o5", label: "5억이상" },
]

const SORTS: { value: Sort; label: string }[] = [
  { value: "profit", label: "예상차익" },
  { value: "dueSoon", label: "매각 가까운순" },
  { value: "dueLate", label: "매각 먼순" },
  { value: "area", label: "평수 큰순" },
  { value: "density", label: "입지집중도" },
  { value: "absorption", label: "매물 소화기간" },
]

const FAIL_COUNTS = ["__all__", "0", "1", "2", "3", "4", "5"]

const DUE_RANGES = [
  { value: "__all__", label: "매각기일 전체" },
  { value: "7", label: "7일 이내" },
  { value: "14", label: "14일 이내" },
  { value: "30", label: "30일 이내" },
  { value: "60", label: "60일 이내" },
]

/** 원본 "특징 필터" 5종. 강조색과 보조 라벨까지 스냅샷 그대로. */
const TRAITS = [
  {
    id: "old",
    label: "오래된 아파트",
    hint: "30년+",
    accent: "accent-amber-500",
  },
  {
    id: "solo",
    label: "나홀로 아파트",
    hint: "50세대↓",
    accent: "accent-sky-500",
  },
  {
    id: "gap",
    label: "시세 차익 큼",
    hint: "3천↑",
    accent: "accent-emerald-500",
  },
  { id: "rural", label: "시골 아파트", hint: "리", accent: "accent-lime-600" },
  {
    id: "large",
    label: "대형 아파트",
    hint: "85㎡+",
    accent: "accent-violet-500",
  },
] as const

/**
 * 돈되는부동산 (/apt-deals).
 *
 * 필터가 가장 많은 화면이다. 위에서부터
 *   면책 문구 → 아파트/빌라 토글 → 최저가 알약 → 시도·시군구 →
 *   정렬 알약 + 유찰 범위 + 매각기일 + 체크박스 → 특징 필터 박스 → 결과
 *
 * 특징 필터 라벨이 전부 "아파트" 기준인데, 스냅샷이 아파트 선택 상태라
 * 빌라로 바꿨을 때 라벨이 바뀌는지는 알 수 없어 그대로 뒀다.
 */
export function AptDealsPage() {
  const [kind, setKind] = useState<Kind>("apt")
  const [band, setBand] = useState<PriceBand>("all")
  const [sido, setSido] = useState<Sido | "">("")
  const [sigungu, setSigungu] = useState("__all__")
  const [sort, setSort] = useState<Sort>("profit")
  const [failFrom, setFailFrom] = useState("__all__")
  const [failTo, setFailTo] = useState("__all__")
  const [due, setDue] = useState("__all__")
  const [excludeRisky, setExcludeRisky] = useState(false)
  const [excludeLowConfidence, setExcludeLowConfidence] = useState(false)
  const [traits, setTraits] = useState<Record<string, boolean>>({})

  return (
    <div className="space-y-4">
      <PageHeader
        title="돈되는부동산"
        description="진행중인 경매 물건 — AI시세 기반 예상차익순"
      />

      <p className="rounded bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground/70">
        본 AI 시세와 물건추천은 참고용이며, 투자에 대한 모든 책임은 투자자
        본인에게 있습니다.
      </p>

      <div className="flex gap-2">
        {(
          [
            { value: "apt", label: "아파트", Icon: Building2 },
            { value: "villa", label: "빌라", Icon: House },
          ] as const
        ).map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors",
              kind === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs font-medium text-muted-foreground">
          최저가
        </span>
        {PRICE_BANDS.map((b) => (
          <FilterPill
            key={b.value}
            active={band === b.value}
            onClick={() => setBand(b.value)}
          >
            {b.label}
          </FilterPill>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={sido}
              onValueChange={(v) => {
                setSido(v as Sido)
                setSigungu("__all__")
              }}
            >
              <SelectTrigger className="h-9 text-sm" aria-label="시도">
                <SelectValue placeholder="시도" />
              </SelectTrigger>
              <SelectContent>
                {SIDO.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sigungu}
              onValueChange={setSigungu}
              disabled={sido === ""}
            >
              <SelectTrigger className="h-9 text-sm" aria-label="시군구">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체</SelectItem>
                {(sido ? SIGUNGU[sido] : []).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1">
          {SORTS.map((s) => (
            <FilterPill
              key={s.value}
              size="sm"
              active={sort === s.value}
              onClick={() => setSort(s.value)}
              className="font-medium"
            >
              {s.label}
            </FilterPill>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">유찰</span>
          <Select value={failFrom} onValueChange={setFailFrom}>
            <SelectTrigger
              className="h-8 w-auto min-w-[60px] text-xs"
              aria-label="유찰 최소"
            >
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              {FAIL_COUNTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "__all__" ? "전체" : `${c}회`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">~</span>

          <Select value={failTo} onValueChange={setFailTo}>
            <SelectTrigger
              className="h-8 w-auto min-w-[60px] text-xs"
              aria-label="유찰 최대"
            >
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              {FAIL_COUNTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "__all__" ? "전체" : `${c}회`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={due} onValueChange={setDue}>
          <SelectTrigger
            className="h-8 w-auto min-w-[110px] text-xs"
            aria-label="매각기일"
          >
            <SelectValue placeholder="매각기일 전체" />
          </SelectTrigger>
          <SelectContent>
            {DUE_RANGES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <CheckboxFilter
          label="위험물건 제외"
          accent="accent-primary"
          className="ml-auto"
          checked={excludeRisky}
          onChange={(e) => setExcludeRisky(e.target.checked)}
        />
        <CheckboxFilter
          label="신뢰도 낮음 제거"
          accent="accent-emerald-500"
          checked={excludeLowConfidence}
          onChange={(e) => setExcludeLowConfidence(e.target.checked)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2">
        <span className="text-xs font-semibold whitespace-nowrap text-foreground">
          특징 필터
        </span>
        {TRAITS.map((t) => (
          <CheckboxFilter
            key={t.id}
            label={t.label}
            hint={t.hint}
            accent={t.accent}
            count={0}
            checked={traits[t.id] ?? false}
            onChange={(e) =>
              setTraits((prev) => ({ ...prev, [t.id]: e.target.checked }))
            }
          />
        ))}
      </div>

      <EmptyCard>
        {sido === "" ? "시도를 선택해주세요" : "조건에 맞는 물건이 없습니다."}
      </EmptyCard>
    </div>
  )
}
