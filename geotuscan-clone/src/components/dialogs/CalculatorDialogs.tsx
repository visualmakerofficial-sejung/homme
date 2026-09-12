import { useMemo, useState } from "react"
import { Banknote, Calculator, LayoutGrid } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatKoreanMoney, onlyDigits } from "@/lib/format"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
   스냅샷 HTML에는 다이얼로그가 닫힌 상태로만 들어 있어서 내부 계산 로직은
   원본과 같다고 보장할 수 없다. 아래는 공개된 일반 산식으로 재구성한 것.
--------------------------------------------------------------------------- */

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Field({
  label,
  suffix,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <Input inputMode="numeric" className="h-10 pr-10" {...props} />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "price-text text-sm",
          strong && "text-base font-semibold text-primary",
        )}
      >
        {value}
      </span>
    </div>
  )
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border rounded-lg bg-muted px-3 py-1">
      {children}
    </div>
  )
}

function useMoney(initial = "") {
  const [raw, setRaw] = useState(initial)
  const value = Number(raw || 0)
  const display = raw ? value.toLocaleString("ko-KR") : ""
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setRaw(onlyDigits(e.target.value))
  return { value, display, onChange }
}

/** 아파트 계산기: 면적 환산 + 평단가 */
export function AptCalculatorDialog({ open, onOpenChange }: DialogProps) {
  const [area, setArea] = useState("84.95")
  const price = useMoney("")

  const pyeong = Number(area || 0) / 3.305785
  const perPyeong = pyeong > 0 ? Math.round(price.value / pyeong) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            아파트 계산기
          </DialogTitle>
          <DialogDescription>
            전용면적과 금액으로 평수·평단가를 계산합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              전용면적
            </span>
            <div className="relative">
              <Input
                inputMode="decimal"
                value={area}
                onChange={(e) =>
                  setArea(e.target.value.replace(/[^0-9.]/g, ""))
                }
                className="h-10 pr-10"
              />
              <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                ㎡
              </span>
            </div>
          </label>

          <Field
            label="매매가 / 감정가"
            suffix="원"
            placeholder="500,000,000"
            value={price.display}
            onChange={price.onChange}
          />

          <Result>
            <Row label="평수 (전용)" value={`${pyeong.toFixed(2)}평`} />
            <Row
              label="공급면적 추정 (×1.33)"
              value={`${(pyeong * 1.33).toFixed(2)}평`}
            />
            <Row
              label="평당가"
              value={perPyeong > 0 ? formatKoreanMoney(perPyeong) : "-"}
              strong
            />
          </Result>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 입찰계산기: 보증금 · 낙찰가율 · 취득세 · 총 투입금 */
export function BidCalculatorDialog({ open, onOpenChange }: DialogProps) {
  const appraisal = useMoney("")
  const minimum = useMoney("")
  const bid = useMoney("")

  const deposit = Math.round(minimum.value * 0.1)
  const rate = appraisal.value > 0 ? (bid.value / appraisal.value) * 100 : 0
  const acquisitionTax = Math.round(bid.value * 0.046)
  const total = bid.value + acquisitionTax

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
            입찰계산기
          </DialogTitle>
          <DialogDescription>
            보증금은 최저매각가의 10%, 취득세는 4.6% 기준입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field
            label="감정가"
            suffix="원"
            placeholder="300,000,000"
            value={appraisal.display}
            onChange={appraisal.onChange}
          />
          <Field
            label="최저매각가"
            suffix="원"
            placeholder="210,000,000"
            value={minimum.display}
            onChange={minimum.onChange}
          />
          <Field
            label="입찰가"
            suffix="원"
            placeholder="245,000,000"
            value={bid.display}
            onChange={bid.onChange}
          />

          <Result>
            <Row
              label="입찰보증금 (10%)"
              value={deposit > 0 ? formatKoreanMoney(deposit) : "-"}
            />
            <Row
              label="낙찰가율 (감정가 대비)"
              value={rate > 0 ? `${rate.toFixed(1)}%` : "-"}
            />
            <Row
              label="취득세 (4.6%)"
              value={acquisitionTax > 0 ? formatKoreanMoney(acquisitionTax) : "-"}
            />
            <Row
              label="총 투입금액"
              value={total > 0 ? formatKoreanMoney(total) : "-"}
              strong
            />
          </Result>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** DSR 계산기: 원리금균등 기준 총부채원리금상환비율 */
export function DsrCalculatorDialog({ open, onOpenChange }: DialogProps) {
  const income = useMoney("")
  const existing = useMoney("")
  const loan = useMoney("")
  const [interest, setInterest] = useState("4.5")
  const [years, setYears] = useState("30")

  const newAnnual = useMemo(() => {
    const principal = loan.value
    const monthlyRate = Number(interest || 0) / 100 / 12
    const months = Number(years || 0) * 12
    if (principal <= 0 || months <= 0) return 0
    if (monthlyRate === 0) return (principal / months) * 12
    const factor = Math.pow(1 + monthlyRate, months)
    return ((principal * monthlyRate * factor) / (factor - 1)) * 12
  }, [loan.value, interest, years])

  const totalAnnual = newAnnual + existing.value
  const dsr = income.value > 0 ? (totalAnnual / income.value) * 100 : 0
  const over = dsr > 40

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
            DSR 계산기
          </DialogTitle>
          <DialogDescription>
            원리금균등상환 기준으로 총부채원리금상환비율을 계산합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field
            label="연소득"
            suffix="원"
            placeholder="60,000,000"
            value={income.display}
            onChange={income.onChange}
          />
          <Field
            label="기존 대출 연간 원리금"
            suffix="원"
            placeholder="0"
            value={existing.display}
            onChange={existing.onChange}
          />
          <Field
            label="신규 대출금액"
            suffix="원"
            placeholder="200,000,000"
            value={loan.display}
            onChange={loan.onChange}
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                금리
              </span>
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={interest}
                  onChange={(e) =>
                    setInterest(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  className="h-10 pr-8"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                기간
              </span>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={years}
                  onChange={(e) => setYears(onlyDigits(e.target.value))}
                  className="h-10 pr-8"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                  년
                </span>
              </div>
            </label>
          </div>

          <Result>
            <Row
              label="신규 대출 연간 원리금"
              value={newAnnual > 0 ? formatKoreanMoney(Math.round(newAnnual)) : "-"}
            />
            <Row
              label="연간 원리금 합계"
              value={
                totalAnnual > 0 ? formatKoreanMoney(Math.round(totalAnnual)) : "-"
              }
            />
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-xs text-muted-foreground">DSR</span>
              <span
                className={cn(
                  "price-text text-base font-semibold",
                  dsr === 0 && "text-muted-foreground",
                  dsr > 0 && (over ? "text-destructive" : "text-primary"),
                )}
              >
                {dsr > 0 ? `${dsr.toFixed(1)}%` : "-"}
              </span>
            </div>
          </Result>

          {dsr > 0 && (
            <p className="text-xs text-muted-foreground">
              {over
                ? "규제지역 은행권 DSR 40% 한도를 넘습니다."
                : "은행권 DSR 40% 한도 이내입니다."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
