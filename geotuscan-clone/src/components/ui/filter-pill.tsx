import { cn } from "@/lib/utils"

/**
 * 원본 통계/목록 화면 전반에 쓰이는 알약 필터.
 *   기본형 px-2.5 py-1 text-xs        (기간·금액대·물건종류)
 *   작은형 px-2   py-1 text-[11px]     (정렬)
 * 활성: bg-primary/border-primary, 비활성: bg-background + muted 텍스트.
 */
export function FilterPill({
  active,
  size = "default",
  className,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean
  size?: "default" | "sm"
}) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      className={cn(
        "rounded-full border transition-colors",
        size === "default" ? "px-2.5 py-1 text-xs" : "px-2 py-1 text-[11px]",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  )
}
