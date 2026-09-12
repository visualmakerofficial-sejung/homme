import { cn } from "@/lib/utils"

/**
 * 원본의 체크박스 필터. shadcn Checkbox가 아니라 네이티브 input에
 * `accent-*`만 얹은 형태라 그대로 따랐다. 강조색은 항목마다 다르다
 * (accent-primary / emerald / amber / sky / lime / violet).
 */
export function CheckboxFilter({
  label,
  hint,
  count,
  accent = "accent-primary",
  className,
  ...props
}: React.ComponentProps<"input"> & {
  label: string
  /** 라벨 뒤에 붙는 작은 조건 설명 (예: "30년+") */
  hint?: string
  /** 해당 조건에 걸린 건수 */
  count?: number
  /** Tailwind accent-* 클래스. 원본은 항목마다 강조색이 다르다. */
  accent?: string
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-1.5", className)}>
      <input
        type="checkbox"
        className={cn("h-3.5 w-3.5 rounded border-gray-300", accent)}
        {...props}
      />
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {label}
        {hint && (
          <span className="ml-0.5 text-[10px] text-muted-foreground/60">
            {hint}
          </span>
        )}
      </span>
      {count !== undefined && (
        <span className="text-[10px] font-semibold text-primary">{count}</span>
      )}
    </label>
  )
}
