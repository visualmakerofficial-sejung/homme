import { useId, useState } from "react"

import { count } from "@/lib/molit"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
   구간 색 — 첨부 화면의 색 순서를 그대로 옮겼다.
   파랑·초록·주황·빨강·보라·청록·오렌지·분홍·하늘·올리브.

   두 가지는 알고 쓴다.
   1) 구간은 순서가 있는 값이라 원래는 한 색의 농도 단계로 그리는 게 맞다.
      다만 단일 색 램프는 5단계가 한계라 10구간은 애초에 불가능하고,
      원본 화면이 이 색이다. 대신 색만으로 읽지 않게 범례·툴팁을 붙였다.
   2) 초록만 #22c55e → #2e9e4f로 한 단계 눌렀다. 원래 값은 주황과
      적록색약에서 ΔE 5.7까지 붙어 검증기가 떨어뜨린다(지금은 8.6).

   라이트/다크가 같은 색이다. 다크 전용으로 명도를 낮추면 주황·올리브가
   탁한 갈색이 되어 원본과 달라진다. 지금 값은 다크 배경 대비 3:1을 모두
   넘고 색약 구분도 통과하며, 권장 명도대(0.48~0.67)보다 밝은 쪽이라
   어두운 배경에서는 대비가 모자라는 쪽이 아니라 남는 쪽이다.

   슬롯을 다 쓰면 마지막 색으로 묶는다(색을 새로 만들지 않는다).
--------------------------------------------------------------------------- */
const SERIES = [
  "#3b82f6",
  "#2e9e4f",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#38bdf8",
  "#a3b818",
]

export function seriesColor(index: number) {
  return SERIES[Math.min(index, SERIES.length - 1)]
}

/* 축 눈금 ------------------------------------------------------------ */

/** 최댓값을 한 단계 위로 올림한 뒤 4등분한다 (원본 화면의 눈금 간격). */
function axisTicks(max: number, steps = 4): number[] {
  if (max <= 0) return [0]
  const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(max)) - 1))
  const top = Math.ceil(max / mag) * mag
  const out: number[] = []
  for (let i = 0; i <= steps; i += 1) out.push((top / steps) * i)
  return out
}

const tickLabel = (n: number, top: number) => {
  if (n === 0) return "0"
  if (top >= 10000) return `${Math.round(n / 1000)}K`
  return count(Math.round(n))
}

interface Slice {
  label: string
  value: number
  color: string
}

/* ---------------------------------------------------------------------------
   1. 연도별 구간 구성 — 누적 막대.
      막대 하나가 한 해, 안의 칸이 구간이다. 칸 사이는 2px 띄운다.
--------------------------------------------------------------------------- */
export function StackedBars({
  columns,
  rows,
  title,
}: {
  columns: string[]
  rows: { year: number; counts: number[] }[]
  title: string
}) {
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null)

  const W = 520
  const H = 300
  const PAD = { top: 10, right: 10, bottom: 30, left: 42 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const stacks = rows.map((r) => r.counts.reduce((a, b) => a + b, 0))
  const ticks = axisTicks(Math.max(1, ...stacks))
  const top = ticks[ticks.length - 1]
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH

  const slotW = plotW / Math.max(rows.length, 1)
  const barW = Math.min(slotW * 0.52, 108)
  const GAP = 2

  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-[15px] font-semibold">
        {title}
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`${title} 누적 막대그래프`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray={t === 0 ? undefined : "3 4"}
                className="text-border"
              />
              <text
                x={PAD.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {tickLabel(t, top)}
              </text>
            </g>
          ))}

          {rows.map((row, ri) => {
            const x = PAD.left + slotW * ri + (slotW - barW) / 2
            let acc = 0
            return (
              <g key={row.year}>
                {row.counts.map((v, ci) => {
                  const y0 = y(acc)
                  acc += v
                  const y1 = y(acc)
                  const h = y0 - y1 - GAP
                  if (v <= 0 || h <= 0) return null
                  const on = hover?.row === ri && hover?.col === ci
                  return (
                    <rect
                      key={columns[ci]}
                      x={x}
                      y={y1}
                      width={barW}
                      height={h}
                      fill={seriesColor(ci)}
                      opacity={hover && !on ? 0.35 : 1}
                      onMouseEnter={() => setHover({ row: ri, col: ci })}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })}
                <text
                  x={x + barW / 2}
                  y={H - PAD.bottom + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {row.year}년
                </text>
              </g>
            )
          })}
        </svg>

        {hover && (
          <div className="pointer-events-none absolute top-0 right-0 rounded-md border bg-popover px-2 py-1 text-xs shadow-sm">
            <span className="text-muted-foreground">
              {rows[hover.row].year}년{" "}
            </span>
            <span className="font-medium">{columns[hover.col]}</span>{" "}
            <span className="price-text font-semibold">
              {count(rows[hover.row].counts[hover.col])}건
            </span>
          </div>
        )}
      </div>

      <Legend
        items={columns.map((label, i) => ({
          label,
          color: seriesColor(i),
        }))}
      />
    </figure>
  )
}

/* ---------------------------------------------------------------------------
   2. 구간별 비중 — 도넛.
--------------------------------------------------------------------------- */
export function Donut({
  columns,
  totals,
  grandTotal,
  title,
}: {
  columns: string[]
  totals: number[]
  grandTotal: number
  title: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const maskId = useId()

  const sum = totals.reduce((a, b) => a + b, 0) || 1
  const slices: Slice[] = columns.map((label, i) => ({
    label,
    value: totals[i],
    color: seriesColor(i),
  }))

  const SIZE = 240
  const C = SIZE / 2
  const R = 100
  const INNER = 58
  const GAP_DEG = 1.2

  let angle = -90
  const arcs = slices.map((s) => {
    const span = (s.value / sum) * 360
    const a0 = angle + GAP_DEG / 2
    const a1 = angle + span - GAP_DEG / 2
    angle += span
    return { ...s, a0, a1, ok: span > GAP_DEG }
  })

  const point = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)] as const
  }

  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-[15px] font-semibold">
        {title}
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto block h-[240px] w-full max-w-[240px]"
          role="img"
          aria-label={`${title} 도넛그래프`}
        >
          <mask id={maskId}>
            <rect width={SIZE} height={SIZE} fill="black" />
            <circle cx={C} cy={C} r={R} fill="white" />
            <circle cx={C} cy={C} r={INNER} fill="black" />
          </mask>
          <g mask={`url(#${maskId})`}>
            {arcs.map((a, i) => {
              if (!a.ok) return null
              const [x0, y0] = point(R + 2, a.a0)
              const [x1, y1] = point(R + 2, a.a1)
              const large = a.a1 - a.a0 > 180 ? 1 : 0
              return (
                <path
                  key={a.label}
                  d={`M ${C} ${C} L ${x0} ${y0} A ${R + 2} ${R + 2} 0 ${large} 1 ${x1} ${y1} Z`}
                  fill={a.color}
                  opacity={hover !== null && hover !== i ? 0.3 : 1}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </g>
        </svg>

        {hover !== null && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-medium">{slices[hover].label}</span>
            <span className="price-text text-sm font-semibold">
              {count(slices[hover].value)}건
            </span>
            <span className="price-text text-[11px] text-muted-foreground">
              {((slices[hover].value / sum) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <Legend items={slices.map((s) => ({ label: s.label, color: s.color }))} />

      {sum < grandTotal && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
          값이 비어 있는 {count(grandTotal - sum)}건은 제외했습니다.
        </p>
      )}
    </figure>
  )
}

/* 범례 ---------------------------------------------------------------- */

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-3 flex list-none flex-wrap justify-center gap-x-3 gap-y-1.5 p-0">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: it.color }}
          />
          <span className="text-[11px] text-muted-foreground">{it.label}</span>
        </li>
      ))}
    </ul>
  )
}

/* 표 셀 강조 ----------------------------------------------------------- */

/** 표에서 값의 크기에 따라 글자에 강·약을 준다 (첨부 화면의 색 강조). */
export function cellTone(value: number, peak: number) {
  if (peak <= 0 || value === 0) return "text-muted-foreground/50"
  const ratio = value / peak
  if (ratio >= 0.85) return "font-medium text-orange-500 dark:text-orange-400"
  if (ratio <= 0.3) return "text-blue-400 dark:text-blue-300/80"
  return ""
}

export { cn }
