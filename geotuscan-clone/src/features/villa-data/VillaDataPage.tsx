import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
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
  MOLIT_URL,
  MolitParseError,
  SORT_LABELS,
  availableGroups,
  formatDate,
  formatMan,
  parseMolitFile,
  regionOptions,
  sortDeals,
  summarize,
  toPyeong,
  topDongs,
  type AreaGroup,
  type Deal,
  type SortKey,
} from "@/lib/molit"
import { cn } from "@/lib/utils"

const ALL = "__all__"
const PAGE = 50
const SORT_TABS: Exclude<SortKey, "date">[] = [
  "floor",
  "builtYear",
  "area",
  "price",
]

/**
 * 빌라데이터 (/villa-data).
 *
 * 국토교통부 실거래가 파일을 올리면 브라우저 안에서 파싱해
 *  - 지역을 좁히면 거래 목록을 표로 정리하고
 *  - "거래량 TOP 20"은 서울/경기/인천/그 외로 나눠 동별 순위를 낸다.
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

  const [sortKey, setSortKey] = useState<SortKey>("price")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [limit, setLimit] = useState(PAGE)

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

  const summary = useMemo(
    () => (filtered.length ? summarize(filtered) : null),
    [filtered],
  )
  const sorted = useMemo(
    () => sortDeals(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  )
  const top = useMemo(
    () => (deals && showTop ? topDongs(deals, group) : []),
    [deals, showTop, group],
  )

  // 조건이 바뀌면 목록을 처음부터 다시 보여준다
  useEffect(() => setLimit(PAGE), [sido, sigungu, dong, sortKey, sortDir])

  // 파일에 없는 지역군이 선택돼 있으면 있는 쪽으로 옮긴다
  useEffect(() => {
    if (groups.size > 0 && !groups.has(group)) {
      setGroup([...groups][0])
    }
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
      toast.success(
        `거래 ${parsed.length.toLocaleString("ko-KR")}건을 읽었습니다.`,
        {
          description:
            skipped > 0
              ? `형식이 맞지 않는 ${skipped}줄은 건너뛰었습니다.`
              : undefined,
        },
      )
    } catch (err) {
      toast.error(
        err instanceof MolitParseError ? err.message : "파일을 읽지 못했습니다.",
      )
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir(key === "builtYear" ? "asc" : "desc")
    }
  }

  const sigunguList = sido === ALL ? [] : [...(regions?.get(sido)?.keys() ?? [])]
  const dongList =
    sido === ALL || sigungu === ALL
      ? []
      : [...(regions?.get(sido)?.get(sigungu) ?? [])]

  const SortArrow = sortDir === "asc" ? ArrowUp : ArrowDown

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
                      <th className="py-1.5 pr-2 text-left font-medium">순위</th>
                      <th className="py-1.5 pr-2 text-left font-medium">동네</th>
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
                          {row.count.toLocaleString("ko-KR")}
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

      {/* ── 요약 ────────────────────────────────────────── */}
      {summary && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {[
                ["거래건수", `${summary.count.toLocaleString("ko-KR")}건`],
                ["중위 매매가", formatMan(summary.medianMan)],
                ["중위 전용", `${summary.medianPyeong.toFixed(1)}평`],
                [
                  "중위 건축년도",
                  summary.medianBuiltYear > 0
                    ? `${summary.medianBuiltYear}년`
                    : "-",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="price-text text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {summary.years.length > 1 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                <span className="text-[11px] text-muted-foreground">연도별</span>
                {summary.years.map((y) => (
                  <span
                    key={y.year}
                    className="price-text rounded bg-muted px-1.5 py-0.5 text-[11px]"
                  >
                    {y.year} {y.count.toLocaleString("ko-KR")}건
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 정렬 탭 ─────────────────────────────────────── */}
      <div className="flex gap-2">
        {SORT_TABS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={sortKey === key}
            onClick={() => toggleSort(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium transition-colors",
              sortKey === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {SORT_LABELS[key]}
            {sortKey === key && <SortArrow className="h-3 w-3" />}
          </button>
        ))}
      </div>

      {/* ── 거래 목록 ───────────────────────────────────── */}
      {sorted.length > 0 ? (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th
                      onClick={() => toggleSort("date")}
                      className="cursor-pointer py-1.5 pr-3 text-left font-medium hover:text-foreground"
                    >
                      계약일
                    </th>
                    {dong === ALL && (
                      <th className="py-1.5 pr-3 text-left font-medium">동</th>
                    )}
                    <th className="py-1.5 pr-3 text-left font-medium">건물명</th>
                    {(["area", "floor", "builtYear", "price"] as const).map(
                      (key) => (
                        <th
                          key={key}
                          onClick={() => toggleSort(key)}
                          className="cursor-pointer py-1.5 pr-3 text-right font-medium last:pr-0 hover:text-foreground"
                        >
                          {SORT_LABELS[key]}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, limit).map((d, i) => (
                    <tr
                      key={`${d.sido}${d.sigungu}${d.dong}${d.name}${d.year}${d.month}${d.day}${d.priceMan}${i}`}
                      className="border-b last:border-0"
                    >
                      <td className="price-text py-1.5 pr-3 text-xs text-muted-foreground">
                        {formatDate(d)}
                      </td>
                      {dong === ALL && (
                        <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                          {d.dong}
                        </td>
                      )}
                      <td className="max-w-[10rem] truncate py-1.5 pr-3">
                        {d.name || "-"}
                      </td>
                      <td className="price-text py-1.5 pr-3 text-right">
                        {d.areaM2 > 0 ? `${toPyeong(d.areaM2).toFixed(1)}평` : "-"}
                      </td>
                      <td className="price-text py-1.5 pr-3 text-right">
                        {d.floor !== 0 ? `${d.floor}층` : "-"}
                      </td>
                      <td className="price-text py-1.5 pr-3 text-right">
                        {d.builtYear > 0 ? d.builtYear : "-"}
                      </td>
                      <td className="price-text py-1.5 text-right font-semibold">
                        {formatMan(d.priceMan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {sorted.length > limit && (
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="mt-3 w-full rounded-lg border py-2 text-xs font-medium transition-colors hover:bg-accent"
              >
                더 보기 · {(sorted.length - limit).toLocaleString("ko-KR")}건 남음
              </button>
            )}
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
              : "실거래가 파일을 올리면 지역별 거래 내역을 표로 정리해 줍니다"}
          </p>
        </div>
      )}
    </div>
  )
}
