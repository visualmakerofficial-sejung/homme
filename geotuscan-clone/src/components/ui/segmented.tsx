import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
}

/**
 * bg-muted 트랙 위에 올라간 세그먼트 토글.
 * 경매검색(사건번호/주소·키워드)과 AI복기(차익/정확도)가 같은 마크업을 쓴다.
 * 활성 조각만 bg-background + shadow-sm으로 떠오른다.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}) {
  return (
    <div className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
            option.value === value
              ? "bg-background shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
