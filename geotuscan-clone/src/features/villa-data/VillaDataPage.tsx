import { useState } from "react"
import { Database, Trophy } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SIDO, SIGUNGU, type Sido } from "@/data/regions"
import { cn } from "@/lib/utils"

type Metric = "floor" | "builtYear" | "area" | "price"

const METRICS: { value: Metric; label: string }[] = [
  { value: "floor", label: "층수" },
  { value: "builtYear", label: "건축년도" },
  { value: "area", label: "전용평수" },
  { value: "price", label: "매매금액" },
]

/**
 * 빌라데이터 (/villa-data).
 *
 * 다른 탭과 달리 바깥 래퍼가 `space-y-3`이고 제목 블록이 없다.
 * 지역 셀렉트가 3단(시도 / 시군구 / 읍면동)이며 2·3번째는 상위가 정해지기
 * 전까지 disabled다. 2·3번째 라벨은 스냅샷에 안 나와서
 * 빈 상태 문구("연도별 거래건수 피벗테이블")를 근거로 추정했다.
 *
 * "거래량 TOP 20 동네 보기" 버튼만 토큰이 아니라 blue-500→indigo-500
 * 그라데이션을 직접 쓴다. 팔레트를 바꿔도 이 버튼은 안 따라온다 — 원본이 그렇다.
 */
export function VillaDataPage() {
  const [sido, setSido] = useState<Sido | "">("")
  const [sigungu, setSigungu] = useState("__all__")
  const [dong, setDong] = useState("__all__")
  const [metric, setMetric] = useState<Metric>("floor")

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">지역</p>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={sido}
              onValueChange={(v) => {
                setSido(v as Sido)
                setSigungu("__all__")
                setDong("__all__")
              }}
            >
              <SelectTrigger className="h-9" aria-label="시도">
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
              onValueChange={(v) => {
                setSigungu(v)
                setDong("__all__")
              }}
              disabled={sido === ""}
            >
              <SelectTrigger className="h-9" aria-label="시군구">
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

            <Select
              value={dong}
              onValueChange={setDong}
              disabled={sigungu === "__all__"}
            >
              <SelectTrigger className="h-9" aria-label="읍면동">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-indigo-600"
      >
        <Trophy className="h-4 w-4" />
        거래량 TOP 20 동네 보기
      </button>

      <div className="flex gap-2">
        {METRICS.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={metric === m.value}
            onClick={() => setMetric(m.value)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              metric === m.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Database className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">빌라 거래 데이터</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {sido === ""
            ? "시도를 선택하면 연도별 거래건수 피벗테이블을 보여줍니다"
            : "해당 지역의 거래 데이터가 없습니다"}
        </p>
      </div>
    </div>
  )
}
