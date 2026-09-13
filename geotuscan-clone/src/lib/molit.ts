/**
 * 국토교통부 실거래가 공개시스템(rt.molit.go.kr)에서 내려받은 파일을 읽어
 * 연도별 거래건수 피벗으로 만든다.
 *
 * 왜 파일 업로드인가:
 * rt.molit.go.kr의 xls.do는 공개 API가 아니라 그 사이트에서 조건을 고르고
 * 받는 다운로드 엔드포인트다. 세션·폼 파라미터에 묶여 있고 CORS도 열려
 * 있지 않아 브라우저에서 직접 호출할 수 없다. 그래서 사용자가 받은 파일을
 * 그대로 읽는 방식으로 붙였다. 파일은 브라우저 안에서만 처리되고
 * 어디로도 전송되지 않는다.
 */

export const MOLIT_URL = "https://rt.molit.go.kr/pt/xls/xls.do?mobileAt="

export interface Deal {
  sido: string
  sigungu: string
  dong: string
  /** 건물명(연립다세대) 또는 단지명(아파트) */
  name: string
  /** 전용면적 ㎡ */
  areaM2: number
  year: number
  month: number
  /** 거래금액 만원 */
  priceMan: number
  floor: number
  builtYear: number
}

export interface ParseResult {
  deals: Deal[]
  /** 헤더는 찾았지만 값이 비어 건너뛴 줄 수 */
  skipped: number
}

export class MolitParseError extends Error {}

/* ── 1. 원시 표 읽기 ───────────────────────────────────────────────── */

const BOM = String.fromCharCode(0xfeff)
const stripBom = (s: string) => (s.charAt(0) === BOM ? s.slice(1) : s)

/**
 * MOLIT CSV는 보통 CP949다. UTF-8로 먼저 읽되 `fatal: true`를 써서 잘못된
 * 바이트열이면 예외가 나게 하고, 그때 euc-kr로 다시 읽는다.
 *
 * 디코딩 결과에서 U+FFFD(대체문자)를 찾는 방식이 더 흔하지만 쓰지 않았다.
 * 번들러가 그 문자 리터럴을 파일에 그대로 박아 배포 검사에 걸리고,
 * 원래 U+FFFD가 들어 있는 정상 UTF-8 파일을 CP949로 오판하기도 한다.
 */
function decode(buffer: ArrayBuffer): string {
  try {
    return stripBom(new TextDecoder("utf-8", { fatal: true }).decode(buffer))
  } catch {
    try {
      return stripBom(new TextDecoder("euc-kr").decode(buffer))
    } catch {
      return stripBom(new TextDecoder("utf-8").decode(buffer))
    }
  }
}

/** 따옴표 안의 쉼표·줄바꿈까지 처리하는 CSV 파서. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += c
      }
      continue
    }

    if (c === '"') quoted = true
    else if (c === ",") {
      row.push(cell)
      cell = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += c
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

/** xlsx는 SheetJS를 cdnjs에서 필요할 때만 받아 쓴다. */
async function readXlsx(file: File): Promise<string[][]> {
  const XLSX = await loadSheetJs()
  if (!XLSX) {
    throw new MolitParseError(
      "엑셀(.xlsx) 해석기를 불러오지 못했습니다. 실거래가 사이트에서 CSV로 받아 올려 주세요.",
    )
  }
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" })
  const sheet = book.Sheets[book.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" })
}

type SheetJs = {
  read: (data: ArrayBuffer, opts: { type: "array" }) => {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  utils: {
    sheet_to_json: (
      sheet: unknown,
      opts: { header: 1; raw: false; defval: string },
    ) => string[][]
  }
}

let sheetJsPromise: Promise<SheetJs | null> | null = null

function loadSheetJs(): Promise<SheetJs | null> {
  if (sheetJsPromise) return sheetJsPromise
  sheetJsPromise = new Promise((resolve) => {
    const existing = (window as unknown as { XLSX?: SheetJs }).XLSX
    if (existing) return resolve(existing)

    const script = document.createElement("script")
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
    script.async = true
    script.onload = () =>
      resolve((window as unknown as { XLSX?: SheetJs }).XLSX ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return sheetJsPromise
}

/* ── 2. 표 → 거래 목록 ─────────────────────────────────────────────── */

const norm = (s: string) => s.replace(/[\s()㎡"']/g, "").toLowerCase()

/** 컬럼을 이름으로 찾는다. 아파트/연립다세대 파일이 서로 조금 다르다. */
const COLUMNS = {
  region: ["시군구"],
  name: ["건물명", "단지명"],
  area: ["전용면적"],
  ym: ["계약년월"],
  price: ["거래금액"],
  floor: ["층"],
  built: ["건축년도"],
} as const

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 40); i += 1) {
    const cells = rows[i].map(norm)
    const hasRegion = cells.some((c) => c === "시군구")
    const hasPrice = cells.some((c) => c.startsWith("거래금액"))
    if (hasRegion && hasPrice) return i
  }
  return -1
}

function mapColumns(header: string[]): Record<keyof typeof COLUMNS, number> {
  const cells = header.map(norm)
  const out = {} as Record<keyof typeof COLUMNS, number>

  for (const key of Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]) {
    const aliases = COLUMNS[key]
    out[key] = cells.findIndex((c) =>
      // "층"은 "해당층"·"총층" 같은 값과 겹치지 않게 완전일치로만 잡는다
      key === "floor"
        ? c === "층"
        : aliases.some((a) => c.startsWith(norm(a))),
    )
  }
  return out
}

const toNumber = (v: string) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** "인천광역시 연수구 동춘동" → 시도 / 시군구 / 읍면동 */
function splitRegion(value: string) {
  const parts = String(value ?? "").trim().split(/\s+/)
  return {
    sido: parts[0] ?? "",
    // 성남시 분당구처럼 시군구가 두 토막인 경우를 흡수한다
    sigungu: parts.length >= 4 ? `${parts[1]} ${parts[2]}` : (parts[1] ?? ""),
    dong: parts.length >= 4 ? (parts[3] ?? "") : (parts[2] ?? ""),
  }
}

export async function parseMolitFile(file: File): Promise<ParseResult> {
  const lower = file.name.toLowerCase()
  const rows = lower.endsWith(".xlsx")
    ? await readXlsx(file)
    : parseCsv(decode(await file.arrayBuffer()))

  const headerIndex = findHeaderRow(rows)
  if (headerIndex === -1) {
    throw new MolitParseError(
      "실거래가 파일 형식이 아닙니다. '시군구'와 '거래금액' 열이 있는 파일을 올려 주세요.",
    )
  }

  const col = mapColumns(rows[headerIndex])
  if (col.region === -1 || col.price === -1 || col.ym === -1) {
    throw new MolitParseError(
      "필수 열(시군구 / 계약년월 / 거래금액)을 찾지 못했습니다.",
    )
  }

  const deals: Deal[] = []
  let skipped = 0

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const r = rows[i]
    if (!r || r.length === 0) continue

    const region = splitRegion(r[col.region] ?? "")
    const ym = String(r[col.ym] ?? "").replace(/[^0-9]/g, "")
    const price = toNumber(r[col.price] ?? "")

    if (!region.sido || ym.length < 6 || price <= 0) {
      skipped += 1
      continue
    }

    deals.push({
      ...region,
      name: String(r[col.name] ?? "").trim(),
      areaM2: col.area === -1 ? 0 : toNumber(r[col.area]),
      year: Number(ym.slice(0, 4)),
      month: Number(ym.slice(4, 6)),
      priceMan: price,
      floor: col.floor === -1 ? 0 : toNumber(r[col.floor]),
      builtYear: col.built === -1 ? 0 : toNumber(r[col.built]),
    })
  }

  if (deals.length === 0) {
    throw new MolitParseError("읽을 수 있는 거래 내역이 없습니다.")
  }
  return { deals, skipped }
}

/* ── 3. 피벗 ───────────────────────────────────────────────────────── */

export type Metric = "floor" | "builtYear" | "area" | "price"

interface Bucket {
  label: string
  test: (d: Deal) => boolean
}

const PYEONG = 3.305785

export const METRIC_BUCKETS: Record<
  Metric,
  { label: string; buckets: Bucket[] }
> = {
  floor: {
    label: "층수",
    buckets: [
      { label: "반지하·1층", test: (d) => d.floor <= 1 },
      { label: "2층", test: (d) => d.floor === 2 },
      { label: "3층", test: (d) => d.floor === 3 },
      { label: "4층", test: (d) => d.floor === 4 },
      { label: "5층 이상", test: (d) => d.floor >= 5 },
    ],
  },
  builtYear: {
    label: "건축년도",
    buckets: [
      { label: "~1990", test: (d) => d.builtYear > 0 && d.builtYear <= 1990 },
      { label: "1991~2000", test: (d) => d.builtYear >= 1991 && d.builtYear <= 2000 },
      { label: "2001~2010", test: (d) => d.builtYear >= 2001 && d.builtYear <= 2010 },
      { label: "2011~2020", test: (d) => d.builtYear >= 2011 && d.builtYear <= 2020 },
      { label: "2021~", test: (d) => d.builtYear >= 2021 },
    ],
  },
  area: {
    label: "전용평수",
    buckets: [
      { label: "~10평", test: (d) => d.areaM2 / PYEONG < 10 },
      { label: "10~15평", test: (d) => d.areaM2 / PYEONG >= 10 && d.areaM2 / PYEONG < 15 },
      { label: "15~20평", test: (d) => d.areaM2 / PYEONG >= 15 && d.areaM2 / PYEONG < 20 },
      { label: "20~25평", test: (d) => d.areaM2 / PYEONG >= 20 && d.areaM2 / PYEONG < 25 },
      { label: "25평~", test: (d) => d.areaM2 / PYEONG >= 25 },
    ],
  },
  price: {
    label: "매매금액",
    buckets: [
      { label: "~1억", test: (d) => d.priceMan < 10000 },
      { label: "1~2억", test: (d) => d.priceMan >= 10000 && d.priceMan < 20000 },
      { label: "2~3억", test: (d) => d.priceMan >= 20000 && d.priceMan < 30000 },
      { label: "3~5억", test: (d) => d.priceMan >= 30000 && d.priceMan < 50000 },
      { label: "5억~", test: (d) => d.priceMan >= 50000 },
    ],
  },
}

export interface Pivot {
  columns: string[]
  rows: { year: number; counts: number[]; total: number; medianMan: number }[]
  totals: number[]
  grandTotal: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

/** 연도(행) × 구간(열) 거래건수. 행마다 중위 거래가도 함께 낸다. */
export function buildPivot(deals: Deal[], metric: Metric): Pivot {
  const { buckets } = METRIC_BUCKETS[metric]
  const columns = buckets.map((b) => b.label)
  const byYear = new Map<number, Deal[]>()

  for (const d of deals) {
    const list = byYear.get(d.year)
    if (list) list.push(d)
    else byYear.set(d.year, [d])
  }

  const totals = new Array(buckets.length).fill(0)
  const rows = [...byYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => {
      const list = byYear.get(year)!
      const counts = buckets.map((b) => list.filter((d) => b.test(d)).length)
      counts.forEach((c, i) => (totals[i] += c))
      return {
        year,
        counts,
        total: list.length,
        medianMan: median(list.map((d) => d.priceMan)),
      }
    })

  return {
    columns,
    rows,
    totals,
    grandTotal: rows.reduce((sum, r) => sum + r.total, 0),
  }
}

export interface TopArea {
  name: string
  count: number
  medianMan: number
}

/** 거래량 상위 동네. 시군구까지 좁혀졌으면 읍면동 단위로 센다. */
export function topAreas(deals: Deal[], limit = 20): TopArea[] {
  const narrowed = new Set(deals.map((d) => d.sigungu)).size === 1
  const groups = new Map<string, number[]>()

  for (const d of deals) {
    const key = narrowed ? d.dong || d.sigungu : `${d.sigungu} ${d.dong}`.trim()
    if (!key) continue
    const list = groups.get(key)
    if (list) list.push(d.priceMan)
    else groups.set(key, [d.priceMan])
  }

  return [...groups.entries()]
    .map(([name, prices]) => ({
      name,
      count: prices.length,
      medianMan: median(prices),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"))
    .slice(0, limit)
}

/** 파일에 실제로 들어 있는 지역만 셀렉트에 띄운다. */
export function regionOptions(deals: Deal[]) {
  const sido = new Map<string, Map<string, Set<string>>>()
  for (const d of deals) {
    if (!sido.has(d.sido)) sido.set(d.sido, new Map())
    const sigungu = sido.get(d.sido)!
    if (!sigungu.has(d.sigungu)) sigungu.set(d.sigungu, new Set())
    if (d.dong) sigungu.get(d.sigungu)!.add(d.dong)
  }
  return sido
}

/** 1억 3,020만 */
export function formatMan(man: number): string {
  if (!Number.isFinite(man) || man <= 0) return "-"
  const eok = Math.floor(man / 10000)
  const rest = Math.round(man % 10000)
  if (eok > 0) {
    return rest > 0
      ? `${eok.toLocaleString("ko-KR")}억 ${rest.toLocaleString("ko-KR")}만`
      : `${eok.toLocaleString("ko-KR")}억`
  }
  return `${Math.round(man).toLocaleString("ko-KR")}만`
}
