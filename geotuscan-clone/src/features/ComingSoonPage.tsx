import { Card, CardContent } from "@/components/ui/card"
import type { TabItem } from "@/data/nav"

/**
 * 스냅샷은 `경매검색` 탭 하나만 담고 있다. 나머지 5개 탭은 셸 동작을 확인할 수
 * 있도록 같은 카드 시스템을 쓰는 빈 상태로 채웠다.
 */
export function ComingSoonPage({ tab }: { tab: TabItem }) {
  const Icon = tab.icon
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{tab.label}</p>
          <p className="text-xs text-muted-foreground">
            원본 스냅샷에 이 화면은 포함돼 있지 않습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
