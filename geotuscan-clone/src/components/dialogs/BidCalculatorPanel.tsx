import { useMemo, useState } from "react"
import { Banknote, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { onlyDigits } from "@/lib/format"

interface Props {
  open: boolean
  onClose: () => void
}

type Kind = "villa" | "apt"

/** 원본 입력칸: w-24 h-7, 우측 정렬, 단위는 별도 span. 금액 단위는 전부 만원. */
function MoneyRow({
  label,
  value,
  onChange,
  placeholder = "0",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
          className="h-7 w-24 rounded-md border bg-background px-2 text-right text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
          className="h-7 w-full rounded-md border bg-background px-2 text-right text-xs focus:ring-1 focus:ring-primary focus:outline-none"
        />
        <span className="text-[10px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

/**
 * 입찰계산기.
 *
 * 원본은 다이얼로그가 아니라 **전체화면 오버레이**다
 * (`fixed inset-0 z-50 bg-background overflow-y-auto` + sticky 헤더).
 * 입력 항목·기본값(수리비 300 / 기타비용 50 / 대출 80% / 금리 4.5% / 5개월)은
 * 스냅샷 그대로다.
 *
 * 다만 스냅샷은 금액칸이 비어 있는 상태라 **결과 영역이 렌더되지 않았다.**
 * 아래 결과 블록은 하단 면책 문구(종합소득세·일반세율 언급)를 근거로 구성한
 * 것이고, 원본과 항목·산식이 같다는 보장은 없다.
 */
export function BidCalculatorPanel({ open, onClose }: Props) {
  const [kind, setKind] = useState<Kind>("apt")
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

  const result = useMemo(() => {
    const n = (v: string) => Number(v || 0)
    const bidAmt = n(bid)
    const saleAmt = n(sale)
    if (bidAmt <= 0 || saleAmt <= 0) return null

    const costs = n(acquisition) + n(repair) + n(eviction) + n(etc)
    const loan = Math.round((bidAmt * n(loanRatio)) / 100)
    const interest = Math.round((loan * (n(rate) / 100) * n(months)) / 12)
    const cash = bidAmt - loan + costs + interest
    const grossProfit = saleAmt - bidAmt - costs - interest
    // 면책 문구가 "종합소득세 일반세율"을 언급해 기본세율 6~45% 중 구간을 적용.
    const taxRate =
      grossProfit <= 1400 ? 0.06
      : grossProfit <= 5000 ? 0.15
      : grossProfit <= 8800 ? 0.24
      : grossProfit <= 15000 ? 0.35
      : 0.38
    const tax = grossProfit > 0 ? Math.round(grossProfit * taxRate) : 0
    const netProfit = grossProfit - tax
    const roi = cash > 0 ? (netProfit / cash) * 100 : 0

    return { costs, loan, interest, cash, grossProfit, tax, netProfit, roi }
  }, [bid, sale, acquisition, repair, eviction, etc, loanRatio, rate, months])

  if (!open) return null

  const won = (man: number) => `${man.toLocaleString("ko-KR")}만원`

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
          <MoneyRow label="매도예상가 (시세)" value={sale} onChange={setSale} />
        </div>

        <div className="space-y-2 rounded-lg bg-muted/30 p-3">
          <h3 className="mb-2 text-xs font-semibold">비용 항목</h3>
          <MoneyRow
            label="취득세+채권+법무사"
            value={acquisition}
            onChange={setAcquisition}
          />
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
          <div className="space-y-2 rounded-lg bg-muted/30 p-3">
            <h3 className="mb-2 text-xs font-semibold">예상 수익</h3>
            {[
              ["총 비용", won(result.costs)],
              ["대출금", won(result.loan)],
              ["이자", won(result.interest)],
              ["실투자금", won(result.cash)],
              ["세전 차익", won(result.grossProfit)],
              ["예상 세금", won(result.tax)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2"
              >
                <span className="shrink-0 text-xs text-muted-foreground">
                  {label}
                </span>
                <span className="price-text text-xs">{value}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
              <span className="text-xs font-semibold">순수익</span>
              <span
                className={cn(
                  "price-text text-sm font-bold",
                  result.netProfit >= 0 ? "text-primary" : "text-destructive",
                )}
              >
                {won(result.netProfit)}
                <span className="ml-1 text-[10px] font-medium">
                  ({result.roi.toFixed(1)}%)
                </span>
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
