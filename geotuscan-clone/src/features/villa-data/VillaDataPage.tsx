import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftRight,
  Database,
  ExternalLink,
  Trophy,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AREA_GROUPS,
  METRICS,
  METRIC_LIST,
  MOLIT_URL,
  MolitParseError,
  availableGroups,
  buildPivot,
  count,
  formatMan,
  parseMolitFile,
  regionOptions,
  topDongs,
  type AreaGroup,
  type Deal,
  type Metric,
} from "@/lib/molit"
import { cn } from "@/lib/utils"

import { Donut, StackedBars, cellTone } from "./charts"

const ALL = "__all__"

/**
 * 빌라데이터 (/villa-data).
 *
 * 국토교통부 실거래가 파일을 올리면 브라우저 안에서 집계한다.
 *  - 지역을 고르면 연도 × 구간 거래건수 표 (+ 전치 보기)
 *  - 아래에 연도별 누적 막대와 구간 비중 도넛
 *  - "거래량 TOP 20"은 서울/경기/인천/그 외로 나눠 동별 순위를 낸다
 * 파일은 어디로도 전송되지 않는다.
 */
export function VillaDataPage() {
  const [deals, setDeals] = useState<Deal[] | null>(null)
  const [fileName, setFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [sido, setSido] = useState(ALL)
  const [sigungu, setSigungu] = useState(ALL)
  const [dong, setDong] = useState(ALL)

  const [metric, setMetric] = useState<Metric>("floor")
  const [byCategory, setByCategory] = useState(false)

  const [showTop, setShowTop] = useState(false)
  const [group, setGroup] = useState<AreaGroup>("seoul")

  const inputRef = useRef<HTMLInputElement>(null)

  const regions = useMemo(() => (deals ? regionOptions(deals) : null), [deals])
  const groups = useMemo(
    () => (deals ? availableGroups(deals) : new Set<AreaGroup>()),
    [deals],
  )

  const filtered = useMemo(() => {
    if (!deals) return []
    return deals.filter(
      (d) =>
        (sido === ALL || d.sido === sido) &&
        (sigungu === ALL || d.sigungu === sigungu) &&
        (dong === ALL || d.dong === dong),
    )
  }, [deals, sido, sigungu, dong])

  const pivot = useMemo(
    () => (filtered.length ? buildPivot(filtered, metric) : null),
    [filtered, metric],
  )
  const top = useMemo(
    () => (deals && showTop ? topDongs(deals, group) : []),
    [deals, showTop, group],
  )

  useEffect(() => {
    if (groups.size > 0 && !groups.has(group)) setGroup([...groups][0])
  }, [groups, group])

  async function handleFile(file: File) {
    setLoading(true)
    try {
      const { deals: parsed, skipped } = await parseMolitFile(file)
      setDeals(parsed)
      setFileName(file.name)
      setSido(ALL)
      setSigungu(ALL)
      setDong(ALL)
      toast.success(`거래 ${count(parsed.length)}건을 읽었습니다.`, {
        description:
          skipped > 0
            ? `형식이 맞지 않는 ${skipped}줄은 건너뛰었습니다.`
            : undefined,
      })
    } catch (err) {
      toast.error(
        err instanceof MolitParseError
          ? err.message
          : "파일을 읽지 못했습니다.",
      )
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const sigunguList =
    sido === ALL ? [] : [...(regions?.get(sido)?.keys() ?? [])]
  const dongList =
    sido === ALL || sigungu === ALL
      ? []
      : [...(regions?.get(sido)?.get(sigungu) ?? [])]

  const metricLabel = METRICS[metric].label

  return (
    <div className="space-y-3">
      {/* ── 데이터 불러오기 ─────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              실거래가 데이터
            </p>
            {deals && (
              <button
                type="button"
                onClick={() => {
                  setDeals(null)
                  setFileName("")
                  setShowTop(false)
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
                지우기
              </button>
            )}
          </div>

          {deals ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  거래 {count(deals.length)}건
                </p>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
              >
                다른 파일
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void handleFile(file)
              }}
              className={cn(
                "rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <button
                type="button"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {loading ? "읽는 중…" : "파일 선택"}
              </button>
              <span className="text-sm text-muted-foreground">
                {" "}
                또는 끌어다 놓기
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                CSV · XLSX · XLS
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xls,.xlsx,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />

          <a
            href={MOLIT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-accent"
          >
            <span>
              <span className="font-medium">국토교통부 실거래가</span>
              <span className="text-muted-foreground">
                {" "}
                — 지역·기간 고르고 엑셀 받기
              </span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            파일은 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.
          </p>
        </CardContent>
      </Card>

      {/* ── 지역 ────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">지역</p>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={sido}
              onValueChange={(v) => {
                setSido(v)
                setSigungu(ALL)
                setDong(ALL)
              }}
              disabled={!deals}
            >
              <SelectTrigger className="h-9" aria-label="시도">
                <SelectValue placeholder="시도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>시도 전체</SelectItem>
                {[...(regions?.keys() ?? [])].map((name) => (
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
                setDong(ALL)
              }}
              disabled={sido === ALL}
            >
              <SelectTrigger className="h-9" aria-label="시군구">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>전체</SelectItem>
                {sigunguList.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={dong}
              onValueChange={setDong}
              disabled={sigungu === ALL}
            >
              <SelectTrigger className="h-9" aria-label="읍면동">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>전체</SelectItem>
                {dongList.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── 거래량 TOP 20 ───────────────────────────────── */}
      <button
        type="button"
        disabled={!deals}
        onClick={() => setShowTop((v) => !v)}
        aria-expanded={showTop}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40 disabled:hover:from-blue-500 disabled:hover:to-indigo-500"
      >
        <Trophy className="h-4 w-4" />
        거래량 TOP 20 동네 {showTop ? "닫기" : "보기"}
      </button>

      {showTop && deals && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
              {AREA_GROUPS.map((g) => {
                const has = groups.has(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={!has}
                    aria-pressed={group === g.id}
                    onClick={() => setGroup(g.id)}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
                      group === g.id
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground",
                      !has && "opacity-40",
                    )}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>

            {top.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                올린 파일에 이 지역 거래가 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-1.5 pr-2 text-left font-medium">
                        순위
                      </th>
                      <th className="py-1.5 pr-2 text-left font-medium">
                        동네
                      </th>
                      <th className="py-1.5 pr-2 text-right font-medium">
                        거래건수
                      </th>
                      <th className="py-1.5 text-right font-medium">중위가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((row) => (
                      <tr
                        key={row.label}
                        onClick={() => {
                          setSido(row.sido)
                          setSigungu(row.sigungu)
                          setDong(row.dong)
                          setShowTop(false)
                        }}
                        className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent"
                      >
                        <td
                          className={cn(
                            "price-text py-1.5 pr-2 text-xs",
                            row.rank <= 3
                              ? "font-semibold text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.rank}
                        </td>
                        <td className="py-1.5 pr-2">{row.label}</td>
                        <td className="price-text py-1.5 pr-2 text-right font-medium">
                          {count(row.count)}
                        </td>
                        <td className="price-text py-1.5 text-right text-muted-foreground">
                          {formatMan(row.medianMan)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  줄을 누르면 그 동네로 지역이 맞춰집니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 지표 탭 ─────────────────────────────────────── */}
      <div className="flex gap-2">
        {METRIC_LIST.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={metric === m}
            onClick={() => setMetric(m)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              metric === m
                ? "bg-slate-800 text-white shadow-sm dark:bg-slate-700"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {METRICS[m].label}
          </button>
        ))}
      </div>

      {/* ── 집계 표 + 그래프 ────────────────────────────── */}
      {pivot ? (
        <>
          <Card>
            <CardContent className="px-0 pt-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs">
                      <th className="px-3 py-2.5 text-left font-medium">
                        {byCategory ? metricLabel : "연도"}
                      </th>
                      {byCategory
                        ? pivot.rows.map((r) => (
                            <th
                              key={r.year}
                              className="px-3 py-2.5 text-right font-medium"
                            >
                              {r.year}년
                            </th>
                          ))
                        : pivot.columns.map((c) => (
                            <th
                              key={c}
                              className="px-3 py-2.5 text-right font-medium"
                            >
                              {c}
                            </th>
                          ))}
                      <th className="bg-muted px-3 py-2.5 text-right font-semibold">
                        합계
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {byCategory
                      ? pivot.columns.map((col, ci) => (
                          <tr key={col} className="border-b">
                            <td className="px-3 py-2 font-medium">{col}</td>
                            {pivot.rows.map((r) => (
                              <td
                                key={r.year}
                                className={cn(
                                  "price-text px-3 py-2 text-right",
                                  cellTone(r.counts[ci], pivot.peak),
                                )}
                              >
                                {count(r.counts[ci])}
                              </td>
                            ))}
                            <td className="price-text bg-muted/40 px-3 py-2 text-right font-semibold">
                              {count(pivot.totals[ci])}
                            </td>
                          </tr>
                        ))
                      : pivot.rows.map((row) => (
                          <tr key={row.year} className="border-b">
                            <td className="price-text px-3 py-2 font-medium">
                              {row.year}년
                            </td>
                            {row.counts.map((c, i) => (
                              <td
                                key={i}
                                className={cn(
                                  "price-text px-3 py-2 text-right",
                                  cellTone(c, pivot.peak),
                                )}
                              >
                                {count(c)}
                              </td>
                            ))}
                            <td className="price-text bg-muted/40 px-3 py-2 text-right font-semibold">
                              {count(row.total)}
                            </td>
                          </tr>
                        ))}
                  </tbody>

                  <tfoot>
                    <tr className="bg-muted/50 text-sm font-semibold">
                      <td className="px-3 py-2.5">합계</td>
                      {byCategory
                        ? pivot.rows.map((r) => (
                            <td
                              key={r.year}
                              className="price-text px-3 py-2.5 text-right"
                            >
                              {count(r.total)}
                            </td>
                          ))
                        : pivot.totals.map((t, i) => (
                            <td
                              key={i}
                              className="price-text px-3 py-2.5 text-right"
                            >
                              {count(t)}
                            </td>
                          ))}
                      <td className="price-text bg-muted px-3 py-2.5 text-right text-primary">
                        {count(pivot.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setByCategory((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {byCategory ? "연도별 보기" : "카테고리별 보기"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="pt-4 pb-3">
                <StackedBars
                  title={`연도별 ${metricLabel} 구성`}
                  columns={pivot.columns}
                  rows={pivot.rows}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <Donut
                  title={`${metricLabel}별 비중`}
                  columns={pivot.columns}
                  totals={pivot.totals}
                  grandTotal={pivot.grandTotal}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">빌라 거래 데이터</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {deals
              ? "선택한 지역에 거래 내역이 없습니다"
              : "실거래가 파일을 올리면 연도별 거래건수를 표와 그래프로 정리해 줍니다"}
          </p>
        </div>
      )}
    </div>
  )
}
