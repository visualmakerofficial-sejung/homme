import { useState } from "react"
import { ChevronDown, Trophy, type LucideIcon } from "lucide-react"

import { EmptyCard, PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SIDO, SIGUNGU, monthOptions, type Sido } from "@/data/regions"
import { cn } from "@/lib/utils"

const MONTHS = monthOptions()

export interface StatsPageProps {
  title: string
  description: string
  icon?: LucideIcon
}

/**
 * 아파트경쟁률(/apt-stats)과 빌라경쟁률(/villa-stats)은 제목·아이콘·부제만
 * 다르고 마크업이 완전히 동일하다. 두 스냅샷을 normalize해서 diff해 보면
 * 그 세 곳 말고는 차이가 없어서 한 컴포넌트로 합쳤다.
 *
 * 구성: 랭킹 접이식 카드 → 시도/시군구 카드 → 시작월~종료월 → 결과 영역
 */
export function StatsPage({ title, description, icon }: StatsPageProps) {
  const [rankingOpen, setRankingOpen] = useState(false)
  const [sido, setSido] = useState<Sido | "">("")
  const [sigungu, setSigungu] = useState("__all__")
  const [fromMonth, setFromMonth] = useState("__all__")
  const [toMonth, setToMonth] = useState("__all__")

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} icon={icon} />

      <Card>
        <CardContent className="pt-3 pb-3">
          <button
            type="button"
            aria-expanded={rankingOpen}
            onClick={() => setRankingOpen((v) => !v)}
            className="flex w-full items-center gap-2"
          >
            <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="text-sm font-semibold">지역 랭킹 TOP 10</span>
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                rankingOpen && "rotate-180",
              )}
            />
          </button>
          {rankingOpen && (
            <p className="pt-3 text-center text-xs text-muted-foreground">
              랭킹 데이터가 아직 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

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

      <div className="flex items-center gap-2">
        <Select value={fromMonth} onValueChange={setFromMonth}>
          <SelectTrigger className="h-8 flex-1 text-xs" aria-label="시작월">
            <SelectValue placeholder="시작월" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">시작월</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">~</span>

        <Select value={toMonth} onValueChange={setToMonth}>
          <SelectTrigger className="h-8 flex-1 text-xs" aria-label="종료월">
            <SelectValue placeholder="종료월" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">종료월</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <EmptyCard>
        {sido === "" ? "시도를 선택해주세요" : "해당 조건의 통계가 없습니다."}
      </EmptyCard>
    </div>
  )
}
