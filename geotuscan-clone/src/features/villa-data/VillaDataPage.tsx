import { useMemo, useRef, useState } from "react"
import { Database, ExternalLink, Trophy, Upload, X } from "lucide-react"
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
  METRIC_BUCKETS,
  MOLIT_URL,
  MolitParseError,
  buildPivot,
  formatMan,
  parseMolitFile,
  regionOptions,
  topAreas,
  type Deal,
  type Metric,
} from "@/lib/molit"
import { cn } from "@/lib/utils"

const METRICS: Metric[] = ["floor", "builtYear", "area", "price"]
const ALL = "__all__"

/**
 * 빌라데이터 (/villa-data).
 *
 * 원본은 서버에서 실거래 데이터를 받아 오지만 여기엔 그 API가 없다.
 * 사용자가 국토교통부 실거래가 공개시스템에서 받은 파일을 올리면
 * 브라우저 안에서 파싱해 같은 형태의 피벗을 그린다. 파일은 전송되지 않는다.
 *
 * 지역 셀렉트는 정적 목록이 아니라 올린 파일에 실제로 들어 있는 지역으로
 * 채운다. 파일에 없는 지역을 고를 수 있어 봐야 결과가 비기 때문이다.
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
  const [showTop, setShowTop] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const regions = useMemo(() => (deals ? regionOptions(deals) : null), [deals])

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
    () => (showTop && filtered.length ? topAreas(filtered) : []),
    [showTop, filtered],
  )

  async function handleFile(file: File) {
    setLoading(true)
    try {
      const { deals: parsed, skipped } = await parseMolitFile(file)
      setDeals(parsed)
      setFileName(file.name)
      setSido(ALL)
      setSigungu(ALL)
      setDong(ALL)
      toast.success(`거래 ${parsed.length.toLocaleString("ko-KR")}건을 읽었습니다.`, {
        description: skipped > 0 ? `형식이 맞지 않는 ${skipped}줄은 건너뛰었습니다.` : undefined,
      })
    } catch (err) {
      toast.error(
        err instanceof MolitParseError ? err.message : "파일을 읽지 못했습니다.",
      )
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const sigunguList = sido === ALL ? [] : [...(regions?.get(sido)?.keys() ?? [])]
  const dongList =
    sido === ALL || sigungu === ALL
      ? []
      : [...(regions?.get(sido)?.get(sigungu) ?? [])]

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
                  거래 {deals.length.toLocaleString("ko-KR")}건
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
              <span className="text-sm text-muted-foreground"> 또는 끌어다 놓기</span>
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

            <Select value={dong} onValueChange={setDong} disabled={sigungu === ALL}>
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

      {/* ── TOP 20 ──────────────────────────────────────── */}
      <button
        type="button"
        disabled={!filtered.length}
        onClick={() => setShowTop((v) => !v)}
        aria-expanded={showTop}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-indigo-600 disabled:opacity-40 disabled:hover:from-blue-500 disabled:hover:to-indigo-500"
      >
        <Trophy className="h-4 w-4" />
        거래량 TOP 20 동네 {showTop ? "닫기" : "보기"}
      </button>

      {showTop && top.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-1.5 pr-2 text-left font-medium">#</th>
                    <th className="py-1.5 pr-2 text-left font-medium">동네</th>
                    <th className="py-1.5 pr-2 text-right font-medium">거래</th>
                    <th className="py-1.5 text-right font-medium">중위가</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((area, i) => (
                    <tr key={area.name} className="border-b last:border-0">
                      <td className="price-text py-1.5 pr-2 text-xs text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-1.5 pr-2">{area.name}</td>
                      <td className="price-text py-1.5 pr-2 text-right">
                        {area.count.toLocaleString("ko-KR")}
                      </td>
                      <td className="price-text py-1.5 text-right text-muted-foreground">
                        {formatMan(area.medianMan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 지표 탭 ─────────────────────────────────────── */}
      <div className="flex gap-2">
        {METRICS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={metric === m}
            onClick={() => setMetric(m)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              metric === m
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {METRIC_BUCKETS[m].label}
          </button>
        ))}
      </div>

      {/* ── 피벗 ────────────────────────────────────────── */}
      {pivot ? (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">
                연도별 거래건수 · {METRIC_BUCKETS[metric].label}
              </h3>
              <span className="price-text text-xs text-muted-foreground">
                총 {pivot.grandTotal.toLocaleString("ko-KR")}건
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3 text-left font-medium">연도</th>
                    {pivot.columns.map((c) => (
                      <th key={c} className="py-1.5 pr-3 text-right font-medium">
                        {c}
                      </th>
                    ))}
                    <th className="py-1.5 pr-3 text-right font-medium">합계</th>
                    <th className="py-1.5 text-right font-medium">중위가</th>
                  </tr>
                </thead>
                <tbody>
                  {pivot.rows.map((row) => (
                    <tr key={row.year} className="border-b last:border-0">
                      <td className="price-text py-1.5 pr-3 font-medium">
                        {row.year}
                      </td>
                      {row.counts.map((c, i) => (
                        <td
                          key={i}
                          className={cn(
                            "price-text py-1.5 pr-3 text-right",
                            c === 0 && "text-muted-foreground/40",
                          )}
                        >
                          {c.toLocaleString("ko-KR")}
                        </td>
                      ))}
                      <td className="price-text py-1.5 pr-3 text-right font-semibold">
                        {row.total.toLocaleString("ko-KR")}
                      </td>
                      <td className="price-text py-1.5 text-right text-muted-foreground">
                        {formatMan(row.medianMan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-sm font-semibold">
                    <td className="py-1.5 pr-3">전체</td>
                    {pivot.totals.map((t, i) => (
                      <td key={i} className="price-text py-1.5 pr-3 text-right">
                        {t.toLocaleString("ko-KR")}
                      </td>
                    ))}
                    <td className="price-text py-1.5 pr-3 text-right text-primary">
                      {pivot.grandTotal.toLocaleString("ko-KR")}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">빌라 거래 데이터</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {deals
              ? "선택한 지역에 거래 내역이 없습니다"
              : "실거래가 파일을 올리면 연도별 거래건수 피벗테이블을 보여줍니다"}
          </p>
        </div>
      )}
    </div>
  )
}
