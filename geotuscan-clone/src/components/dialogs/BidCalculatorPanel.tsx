import { useMemo, useState } from "react"
import { Banknote, Target, X } from "lucide-react"

import { onlyDigits } from "@/lib/format"
import { calculateBid, man, solveBidForProfit } from "@/lib/bid-calc"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
}

type Kind = "villa" | "apt"

const inputClass =
  "h-7 rounded-md border bg-background px-2 text-right text-xs focus:ring-1 focus:ring-primary focus:outline-none"

function MoneyRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          placeholder="0"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
          className={cn(inputClass, "w-24")}
        />
        <span className="w-6 text-[10px] text-muted-foreground">만원</span>
      </div>
    </div>
  )
}

function RateField({
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

/** 결과 카드의 한 줄. 총 제비용만 값이 primary 색이다. */
function ResultRow({
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
        <span
          className={cn("text-sm font-semibold", accent && "text-primary")}
        >
          {value}
        </span>
        {note && (
          <span className="ml-1 text-[10px] text-muted-foreground">{note}</span>
        )}
      </div>
    </div>
  )
}

const Divider = () => <div className="my-1 border-t" />

/**
 * 입찰계산기. 다이얼로그가 아니라 전체화면 오버레이다
 * (`fixed inset-0 z-50 bg-background overflow-y-auto` + sticky 헤더).
 *
 * 모드별 차이 (스냅샷 2장에서 확인):
 * - 빌라/도생: 취득세 입력 없음 → 입찰가의 1.1%로 자동 산정.
 *              "기대수익으로 입찰가 역산" 블록이 있다.
 * - 아파트   : "취득세+채권+법무사"를 직접 입력한다.
 *
 * 다만 두 스냅샷이 모드와 입력 채움 상태가 동시에 달라서, 역산 블록이
 * 빌라 전용인지 "매도예상가가 채워졌을 때만" 나오는 건지는 구분할 수 없었다.
 * 관찰한 조합대로 빌라 전용으로 뒀다.
 */
export function BidCalculatorPanel({ open, onClose }: Props) {
  const [kind, setKind] = useState<Kind>("villa")
  const [appraisal, setAppraisal] = useState("")
  const [bid, setBid] = useState("")
  const [sale, setSale] = useState("")
  const [acquisition, setAcquisition] = useState("")
  const [repair, setRepair] = useState("300")
  const [eviction, setEviction] = useState("0")
  const [etc, setEtc] = useState("50")
  const [loanRatio, setLoanRatio] = useState("80")
  const [rate, setRate] = useState("4.5")
  const [months, setMonths] = useState("5")
  const [targetProfit, setTargetProfit] = useState("")

  const n = (v: string) => Number(v || 0)
  const base = {
    kind,
    appraisal: n(appraisal),
    sale: n(sale),
    acquisitionManual: n(acquisition),
    repair: n(repair),
    eviction: n(eviction),
    etc: n(etc),
    loanRatio: n(loanRatio),
    rate: n(rate),
    months: n(months),
  }

  const result = useMemo(
    () => calculateBid({ ...base, bid: n(bid) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, appraisal, bid, sale, acquisition, repair, eviction, etc, loanRatio, rate, months],
  )

  const bidRatio =
    n(appraisal) > 0 && n(bid) > 0 ? (n(bid) / n(appraisal)) * 100 : null

  function handleSolve() {
    const solved = solveBidForProfit(base, n(targetProfit))
    if (solved) setBid(String(solved))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold">입찰계산기</h2>
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

      <div className="mx-auto max-w-lg space-y-4 p-4 pb-20">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { value: "villa", label: "빌라/도생" },
              { value: "apt", label: "아파트" },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={kind === o.value}
              onClick={() => setKind(o.value)}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-all",
                kind === o.value
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="space-y-2 rounded-lg bg-muted/30 p-3">
          <h3 className="mb-2 text-xs font-semibold">기본 정보</h3>
          <MoneyRow label="감정가" value={appraisal} onChange={setAppraisal} />
          <MoneyRow label="입찰가 (낙찰가)" value={bid} onChange={setBid} />
          {bidRatio !== null && (
            <div className="text-right">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                낙찰가율 {bidRatio.toFixed(1)}%
              </span>
            </div>
          )}
          <MoneyRow label="매도예상가 (시세)" value={sale} onChange={setSale} />

          {kind === "villa" && (
            <div className="mt-2 border-t pt-2">
              <div className="mb-1 flex items-center gap-1">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-semibold text-primary">
                  기대수익으로 입찰가 역산
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="기대수익 (만원)"
                    aria-label="기대수익"
                    value={targetProfit}
                    onChange={(e) =>
                      setTargetProfit(onlyDigits(e.target.value))
                    }
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={n(targetProfit) <= 0 || n(sale) <= 0}
                  onClick={handleSolve}
                  className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  입찰가 계산
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg bg-muted/30 p-3">
          <h3 className="mb-2 text-xs font-semibold">비용 항목</h3>
          {kind === "apt" && (
            <MoneyRow
              label="취득세+채권+법무사"
              value={acquisition}
              onChange={setAcquisition}
            />
          )}
          <MoneyRow label="수리비" value={repair} onChange={setRepair} />
          <MoneyRow label="명도비" value={eviction} onChange={setEviction} />
          <MoneyRow label="기타비용" value={etc} onChange={setEtc} />

          <div className="mt-2 space-y-2 border-t pt-2">
            <h4 className="text-[10px] font-medium text-muted-foreground">
              대출/이자
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <RateField
                label="대출비율"
                unit="%"
                value={loanRatio}
                onChange={setLoanRatio}
              />
              <RateField
                label="금리"
                unit="%"
                value={rate}
                onChange={setRate}
                decimal
              />
              <RateField
                label="이자 기간"
                unit="월"
                value={months}
                onChange={setMonths}
              />
            </div>
          </div>
        </div>

        {result && (
          <div className="space-y-1 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <h3 className="mb-3 text-sm font-bold text-primary">
              투자 분석 결과
            </h3>

            <ResultRow
              label="낙찰가율"
              value={`${result.bidRatio.toFixed(1)}%`}
            />
            <Divider />

            <ResultRow label="취득세" value={man(result.acquisitionTax)} />
            <ResultRow label="중개비" value={man(result.brokerage)} />
            <ResultRow
              label={`이자 (${n(months)}개월)`}
              value={man(result.interest)}
            />
            <ResultRow label="수리비" value={man(n(repair))} />
            <ResultRow label="명도비" value={man(n(eviction))} />
            <ResultRow label="기타비용" value={man(n(etc))} />
            <ResultRow label="총 제비용" value={man(result.totalCost)} accent />
            <Divider />

            <ResultRow label="예상 소득금액" value={man(result.income)} />
            <ResultRow
              label={`종합소득세 (${Math.round(result.incomeTaxRate * 100)}%)`}
              value={man(result.incomeTax)}
              note={
                result.incomeTaxDeduction > 0
                  ? `공제 ${man(result.incomeTaxDeduction)}`
                  : undefined
              }
            />
            <ResultRow label="지방소득세 (10%)" value={man(result.localTax)} />
            <Divider />

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-bold">순수이익</span>
              <span
                className={cn(
                  "text-lg font-bold",
                  result.netProfit >= 0
                    ? "text-emerald-600"
                    : "text-destructive",
                )}
              >
                {result.netProfit >= 0 ? "+" : ""}
                {man(result.netProfit)}
              </span>
            </div>
            <Divider />

            <ResultRow label="대출가능금액" value={man(result.loan)} />
            <ResultRow
              label="투자필요금 (자기자본)"
              value={man(result.ownCapital)}
            />

            <div className="mt-3 rounded-lg border bg-background p-3 text-center">
              <span className="mb-1 block text-xs text-muted-foreground">
                예상 수익률
              </span>
              <span
                className={cn(
                  "text-2xl font-bold",
                  result.roi >= 0 ? "text-emerald-600" : "text-destructive",
                )}
              >
                {result.roi >= 0 ? "+" : ""}
                {result.roi.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          본 계산기는 참고용이며, 정확한 세금은 세무사에게 문의하세요.
          <br />
          종합소득세는 일반세율 기준이며, 단기보유·다주택 중과는 미반영됩니다.
        </p>
      </div>
    </div>
  )
}
