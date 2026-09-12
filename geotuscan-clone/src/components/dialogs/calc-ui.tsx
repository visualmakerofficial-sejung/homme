import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"

import { onlyDigits } from "@/lib/format"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
   입찰계산기 스냅샷에서 확인한 계산기 화면의 공통 골격.
   원본 헤더의 계산기 3종 중 입찰계산기만 스냅샷이 있는데, 다이얼로그가 아니라
   전체화면 오버레이 + sticky 헤더 형태였다. 금액 단위는 전부 만원이고
   결과는 border-2 border-primary/20 bg-primary/5 카드에 담긴다.
   나머지 두 계산기(아파트·DSR)는 스냅샷이 없어 이 골격을 따라 맞췄다.
--------------------------------------------------------------------------- */

const inputClass =
  "h-7 rounded-md border bg-background px-2 text-right text-xs focus:ring-1 focus:ring-primary focus:outline-none"

/** 전체화면 계산기 셸. */
export function CalcPanel({
  open,
  onClose,
  title,
  icon: Icon,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="rounded-md p-1 hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto max-w-lg space-y-4 p-4 pb-20">{children}</div>
    </div>
  )
}

/** 입력 묶음 (기본 정보 / 비용 항목 …) */
export function CalcSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-2 rounded-lg bg-muted/30 p-3", className)}>
      <h3 className="mb-2 text-xs font-semibold">{title}</h3>
      {children}
    </div>
  )
}

/** 라벨 + 우측정렬 숫자칸 + 단위. 원본 입력칸은 w-24 h-7이다. */
export function MoneyRow({
  label,
  value,
  onChange,
  unit = "만원",
  decimal,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  unit?: string
  decimal?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          placeholder="0"
          aria-label={label}
          value={value}
          onChange={(e) =>
            onChange(
              decimal
                ? e.target.value.replace(/[^0-9.]/g, "")
                : onlyDigits(e.target.value),
            )
          }
          className={cn(inputClass, "w-24")}
        />
        <span className="w-6 text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

/** grid 안에 들어가는 작은 비율 입력 (대출비율 / 금리 / 기간) */
export function RateField({
  label,
  unit,
  value,
  onChange,
  decimal,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  decimal?: boolean
}) {
  return (
    <div>
      <span className="mb-0.5 block text-[10px] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <input
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          aria-label={label}
          value={value}
          onChange={(e) =>
            onChange(
              decimal
                ? e.target.value.replace(/[^0-9.]/g, "")
                : onlyDigits(e.target.value),
            )
          }
          className={cn(inputClass, "w-full")}
        />
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

/** 결과 카드. 원본: border-2 border-primary/20 bg-primary/5 p-4 space-y-1 */
export function ResultCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
      <h3 className="mb-3 text-sm font-bold text-primary">{title}</h3>
      {children}
    </div>
  )
}

export function ResultRow({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: string
  note?: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm font-semibold", accent && "text-primary")}>
          {value}
        </span>
        {note && (
          <span className="ml-1 text-[10px] text-muted-foreground">{note}</span>
        )}
      </div>
    </div>
  )
}

/** 결과 카드 하단 강조 줄 (순수이익 등) */
export function ResultHighlight({
  label,
  value,
  positive = true,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-bold">{label}</span>
      <span
        className={cn(
          "text-lg font-bold",
          positive ? "text-emerald-600" : "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** 결과 카드 맨 아래 큰 수치 박스 (예상 수익률 등) */
export function ResultBadge({
  label,
  value,
  tone = "good",
}: {
  label: string
  value: string
  tone?: "good" | "bad"
}) {
  return (
    <div className="mt-3 rounded-lg border bg-background p-3 text-center">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-2xl font-bold",
          tone === "good" ? "text-emerald-600" : "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  )
}

export const Divider = () => <div className="my-1 border-t" />

/** 원본 하단 면책 문구 스타일 */
export function CalcDisclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}
