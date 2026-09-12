/**
 * 원본의 `price-text` 자리에 들어가던 한국식 금액 축약 표기.
 * 130_200_000 -> "1억 3,020만"
 */
export function formatKoreanMoney(won: number): string {
  if (!Number.isFinite(won) || won <= 0) return "-"

  const eok = Math.floor(won / 100_000_000)
  const man = Math.floor((won % 100_000_000) / 10_000)
  const parts: string[] = []

  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`)
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`)
  if (parts.length === 0) parts.push(`${won.toLocaleString("ko-KR")}원`)

  return parts.join(" ")
}

/** 8월 31일 -> "8.31" */
export function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}.${d.getDate()}`
}

/** 2025 + 506797 + 1 -> "2025-506797(1)" */
export function formatCaseNo(year: string, serial: string, item?: string) {
  const base = `${year}-${serial}`
  return item ? `${base}(${item})` : base
}

const numeric = /[^0-9]/g

export function onlyDigits(value: string) {
  return value.replace(numeric, "")
}
