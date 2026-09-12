import { useState } from "react"
import { House } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { MobileTabBar, TabNav } from "@/components/layout/TabNav"
import { ExternalLinksFab } from "@/components/layout/ExternalLinksFab"
import { Toaster } from "@/components/ui/sonner"
import { TABS, type TabId, type TabItem } from "@/data/nav"
import { useThemeMode } from "@/lib/theme"
import { AuctionSearchPage } from "@/features/auction-search/AuctionSearchPage"
import { AiReviewPage } from "@/features/ai-review/AiReviewPage"
import { AptDealsPage } from "@/features/apt-deals/AptDealsPage"
import { StatsPage } from "@/features/stats/StatsPage"
import { ComingSoonPage } from "@/features/ComingSoonPage"

/** 원본 RSC 페이로드에 그대로 들어 있던 세션 값. */
const MEMBER = {
  name: "추진헌",
  phone: "01087717357",
  serviceEnd: "2026-10-01",
}

/**
 * 탭 → 화면. 빌라데이터만 스냅샷이 없어 빈 상태로 남겨 뒀다.
 * 아파트경쟁률/빌라경쟁률은 원본 마크업이 동일해서 StatsPage 하나를 공유한다.
 */
function renderTab(active: TabId, tab: TabItem) {
  switch (active) {
    case "auction-search":
      return <AuctionSearchPage />
    case "profitable":
      return <AptDealsPage />
    case "ai-review":
      return <AiReviewPage />
    case "apt-competition":
      return (
        <StatsPage
          title="아파트 경쟁률"
          description="지역별 월별 경매 낙찰 통계 (2024~)"
        />
      )
    case "villa-competition":
      return (
        <StatsPage
          title="빌라 경쟁률"
          description="빌라+도시형 지역별 월별 경매 낙찰 통계 (2024~)"
          icon={House}
        />
      )
    default:
      return <ComingSoonPage tab={tab} />
  }
}

/**
 * 원본 (tabs) 레이아웃:
 *   min-h-screen flex flex-col
 *     Header
 *     TabNav (데스크톱) + MobileTabBar (모바일)
 *     main  flex-1 p-4 pb-20 md:pb-4 max-w-5xl mx-auto w-full
 *     ExternalLinks (FAB)
 * main의 `pb-20`은 모바일 하단 탭바에 콘텐츠가 가리지 않게 하는 여백이다.
 */
export default function App() {
  const [active, setActive] = useState<TabId>("auction-search")
  const theme = useThemeMode()
  const tab = TABS.find((t) => t.id === active)!

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        memberName={MEMBER.name}
        memberPhone={MEMBER.phone}
        serviceEnd={MEMBER.serviceEnd}
        onLogoClick={() => setActive("auction-search")}
      />

      <TabNav active={active} onChange={setActive} />
      <MobileTabBar active={active} onChange={setActive} />

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-20 md:pb-4">
        {renderTab(active, tab)}
      </main>

      <ExternalLinksFab />

      <Toaster theme={theme} />
    </div>
  )
}
