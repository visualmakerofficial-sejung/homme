import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

/**
 * 원본 탭 페이지 머리말. h1은 text-lg font-bold, 아이콘이 붙는 화면
 * (빌라 경쟁률)은 w-5 h-5로 나란히 놓는다.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return (
    <>
      {Icon ? (
        <h1 className="flex items-center gap-2 text-lg font-bold">
          <Icon className="h-5 w-5" />
          {title}
        </h1>
      ) : (
        <h1 className="text-lg font-bold">{title}</h1>
      )}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </>
  )
}

/** 조건 미선택/결과 없음 카드. 원본은 h-40 중앙정렬과 py-12 두 가지를 쓴다. */
export function EmptyCard({
  children,
  variant = "center",
}: {
  children: React.ReactNode
  variant?: "center" | "block"
}) {
  return (
    <Card>
      <CardContent
        className={
          variant === "center"
            ? "flex h-40 items-center justify-center text-sm text-muted-foreground"
            : "py-12 text-center text-sm text-muted-foreground"
        }
      >
        {children}
      </CardContent>
    </Card>
  )
}
