import { useMemo, useState } from "react"
import { Calculator, LayoutGrid } from "lucide-react"

import {
  CalcDisclaimer,
  CalcPanel,
  CalcSection,
  Divider,
  MoneyRow,
  RateField,
  ResultBadge,
  ResultCard,
  ResultHighlight,
  ResultRow,
} from "./calc-ui"
import { man } from "@/lib/bid-calc"

interface Props {
  open: boolean
  onClose: () => void
}

/* ---------------------------------------------------------------------------
   헤더의 "아파트 계산기"와 "DSR"은 스냅샷을 못 받았다. 내부 구성과 산식은
   확인할 수 없어 공개된 일반 산식으로 재구성한 것이고, 겉모습만 스냅샷으로
   확인된 입찰계산기 규칙(전체화면 / 만원 단위 / 결과 카드)에 맞췄다.
   원본 화면을 받으면 이 두 파일만 교체하면 된다.
--------------------------------------------------------------------------- */

const PYEONG = 3.305785

/** 아파트 계산기 — 면적 환산과 평단가. */
export function AptCalculatorPanel({ open, onClose }: Props) {
  const [area, setArea] = useState("84.95")
  const [price, setPrice] = useState("")

  const n = (v: string) => Number(v || 0)
  const pyeong = n(area) / PYEONG
  const supplyPyeong = pyeong * 1.33
  const perPyeong = pyeong > 0 ? n(price) / pyeong : 0

  return (
    <CalcPanel
      open={open}
      onClose={onClose}
      title="아파트 계산기"
      icon={LayoutGrid}
    >
      <CalcSection title="기본 정보">
        <MoneyRow
          label="전용면적"
          unit="㎡"
          value={area}
          onChange={setArea}
          decimal
        />
        <MoneyRow label="매매가 / 감정가" value={price} onChange={setPrice} />
      </CalcSection>

      {pyeong > 0 && (
        <ResultCard title="면적 환산 결과">
          <ResultRow label="전용면적" value={`${n(area).toFixed(2)}㎡`} />
          <ResultRow label="전용 평수" value={`${pyeong.toFixed(2)}평`} />
          <Divider />
          <ResultRow
            label="공급면적 추정"
            value={`${(supplyPyeong * PYEONG).toFixed(2)}㎡`}
            note="전용 × 1.33"
          />
          <ResultRow
            label="공급 평수 추정"
            value={`${supplyPyeong.toFixed(2)}평`}
          />
          {perPyeong > 0 && (
            <>
              <Divider />
              <ResultRow label="전용 평단가" value={man(perPyeong)} accent />
              <ResultBadge
                label="공급 평단가"
                value={man(n(price) / supplyPyeong)}
              />
            </>
          )}
        </ResultCard>
      )}

      <CalcDisclaimer>
        공급면적은 전용률 75% 가정(전용 × 1.33)으로 추정한 값입니다.
        <br />
        실제 공급면적은 단지마다 다르니 등기부·건축물대장을 확인하세요.
      </CalcDisclaimer>
    </CalcPanel>
  )
}

/** DSR 계산기 — 원리금균등상환 기준 총부채원리금상환비율. */
export function DsrCalculatorPanel({ open, onClose }: Props) {
  const [income, setIncome] = useState("")
  const [existing, setExisting] = useState("0")
  const [loan, setLoan] = useState("")
  const [rate, setRate] = useState("4.5")
  const [years, setYears] = useState("30")

  const n = (v: string) => Number(v || 0)

  const calc = useMemo(() => {
    const principal = n(loan)
    const months = n(years) * 12
    const monthlyRate = n(rate) / 100 / 12
    if (principal <= 0 || months <= 0 || n(income) <= 0) return null

    const monthly =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1)

    const newAnnual = monthly * 12
    const totalAnnual = newAnnual + n(existing)
    const dsr = (totalAnnual / n(income)) * 100
    const headroom = n(income) * 0.4 - n(existing)

    return { monthly, newAnnual, totalAnnual, dsr, headroom }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, existing, loan, rate, years])

  const over = (calc?.dsr ?? 0) > 40

  return (
    <CalcPanel
      open={open}
      onClose={onClose}
      title="DSR 계산기"
      icon={Calculator}
    >
      <CalcSection title="소득 / 기존 대출">
        <MoneyRow label="연소득" value={income} onChange={setIncome} />
        <MoneyRow
          label="기존 대출 연간 원리금"
          value={existing}
          onChange={setExisting}
        />
      </CalcSection>

      <CalcSection title="신규 대출">
        <MoneyRow label="대출금액" value={loan} onChange={setLoan} />
        <div className="mt-2 space-y-2 border-t pt-2">
          <h4 className="text-[10px] font-medium text-muted-foreground">
            상환 조건
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <RateField
              label="금리"
              unit="%"
              value={rate}
              onChange={setRate}
              decimal
            />
            <RateField
              label="기간"
              unit="년"
              value={years}
              onChange={setYears}
            />
          </div>
        </div>
      </CalcSection>

      {calc && (
        <ResultCard title="DSR 분석 결과">
          <ResultRow label="월 상환액" value={man(calc.monthly)} />
          <ResultRow label="신규 연간 원리금" value={man(calc.newAnnual)} />
          <ResultRow label="기존 연간 원리금" value={man(n(existing))} />
          <ResultRow
            label="연간 원리금 합계"
            value={man(calc.totalAnnual)}
            accent
          />
          <Divider />
          <ResultRow
            label="DSR 40% 한도 여력"
            value={man(calc.headroom)}
            note="연간 기준"
          />
          <Divider />
          <ResultHighlight
            label="DSR"
            value={`${calc.dsr.toFixed(1)}%`}
            positive={!over}
          />
          <ResultBadge
            label={over ? "은행권 한도 초과" : "은행권 한도 이내"}
            value={`${calc.dsr.toFixed(1)}% / 40%`}
            tone={over ? "bad" : "good"}
          />
        </ResultCard>
      )}

      <CalcDisclaimer>
        원리금균등상환 기준이며, 은행권 DSR 한도 40%를 기준선으로 표시합니다.
        <br />
        실제 한도는 상품·규제지역·차주 조건에 따라 달라집니다.
      </CalcDisclaimer>
    </CalcPanel>
  )
}
