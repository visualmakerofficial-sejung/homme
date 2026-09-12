/**
 * 입찰계산기 산식.
 *
 * 값이 채워진 스냅샷(감정가 9100 / 입찰가 5818 / 매도 9000 / 수리비 800 /
 * 명도 0 / 기타 50 / 대출 80% / 4.5% / 5개월)의 결과 12개 항목을 역산해
 * 전부 일치하는 것을 확인한 식이다. 단위는 전부 만원.
 */

/** 종합소득세 기본세율 (과세표준 만원 기준, 누진공제 포함) */
const INCOME_TAX_BRACKETS = [
  { upTo: 1_400, rate: 0.06, deduction: 0 },
  { upTo: 5_000, rate: 0.15, deduction: 126 },
  { upTo: 8_800, rate: 0.24, deduction: 576 },
  { upTo: 15_000, rate: 0.35, deduction: 1_544 },
  { upTo: 30_000, rate: 0.38, deduction: 1_994 },
  { upTo: 50_000, rate: 0.4, deduction: 2_594 },
  { upTo: 100_000, rate: 0.42, deduction: 3_594 },
  { upTo: Infinity, rate: 0.45, deduction: 6_594 },
]

/** 빌라/도생 모드에서 자동 산정되는 취득세율 (취득세 1% + 지방교육세 0.1%) */
export const VILLA_ACQUISITION_RATE = 0.011
/** 매도 시 중개보수율 */
export const BROKERAGE_RATE = 0.007

export interface BidCalcInput {
  kind: "villa" | "apt"
  appraisal: number
  bid: number
  sale: number
  /** 아파트 모드에서 직접 입력하는 취득세+채권+법무사 */
  acquisitionManual: number
  repair: number
  eviction: number
  etc: number
  loanRatio: number
  rate: number
  months: number
}

export interface BidCalcResult {
  bidRatio: number
  acquisitionTax: number
  brokerage: number
  interest: number
  totalCost: number
  income: number
  incomeTax: number
  incomeTaxRate: number
  incomeTaxDeduction: number
  localTax: number
  netProfit: number
  loan: number
  ownCapital: number
  roi: number
}

export function calculateBid(input: BidCalcInput): BidCalcResult | null {
  const { bid, sale, appraisal } = input
  if (bid <= 0 || sale <= 0) return null

  const acquisitionTax =
    input.kind === "villa"
      ? Math.round(bid * VILLA_ACQUISITION_RATE)
      : input.acquisitionManual
  const brokerage = Math.round(sale * BROKERAGE_RATE)
  const loan = Math.round((bid * input.loanRatio) / 100)
  const interest = Math.round((loan * (input.rate / 100) * input.months) / 12)

  const totalCost =
    acquisitionTax +
    brokerage +
    interest +
    input.repair +
    input.eviction +
    input.etc

  const income = sale - bid - totalCost

  const bracket =
    INCOME_TAX_BRACKETS.find((b) => income <= b.upTo) ??
    INCOME_TAX_BRACKETS[INCOME_TAX_BRACKETS.length - 1]
  const incomeTax =
    income > 0 ? Math.max(0, Math.round(income * bracket.rate - bracket.deduction)) : 0
  const localTax = Math.round(incomeTax * 0.1)

  const netProfit = income - incomeTax - localTax
  const ownCapital = bid - loan + totalCost

  return {
    bidRatio: appraisal > 0 ? (bid / appraisal) * 100 : 0,
    acquisitionTax,
    brokerage,
    interest,
    totalCost,
    income,
    incomeTax,
    incomeTaxRate: bracket.rate,
    incomeTaxDeduction: bracket.deduction,
    localTax,
    netProfit,
    loan,
    ownCapital,
    roi: ownCapital > 0 ? (netProfit / ownCapital) * 100 : 0,
  }
}

/**
 * "기대수익으로 입찰가 역산".
 * 순수이익이 목표치가 되는 입찰가를 이분탐색으로 찾는다. 입찰가가 오르면
 * 순수이익은 단조 감소하므로 해가 하나다. (원본 구현 방식은 알 수 없다.)
 */
export function solveBidForProfit(
  input: Omit<BidCalcInput, "bid">,
  targetProfit: number,
): number | null {
  if (input.sale <= 0 || targetProfit <= 0) return null

  let low = 1
  let high = input.sale
  let answer: number | null = null

  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2
    const result = calculateBid({ ...input, bid: Math.round(mid) })
    if (!result) break
    if (result.netProfit >= targetProfit) {
      answer = Math.round(mid)
      low = mid
    } else {
      high = mid
    }
    if (high - low < 0.5) break
  }

  return answer
}

/** 결과 표기: 1907 -> "1,907만" */
export function man(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}만`
}
