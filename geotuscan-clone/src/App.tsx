import { useState } from "react"

import { Header } from "@/components/layout/Header"
import { MobileTabBar, TabNav } from "@/components/layout/TabNav"
import { ExternalLinksFab } from "@/components/layout/ExternalLinksFab"
import { Toaster } from "@/components/ui/sonner"
import { TABS, type TabId } from "@/data/nav"
import { useThemeMode } from "@/lib/theme"
import { AuctionSearchPage } from "@/features/auction-search/AuctionSearchPage"
import { ComingSoonPage } from "@/features/ComingSoonPage"

/** 원본 RSC 페이로드에 그대로 들어 있던 세션 값. */
const MEMBER = {
  name: "추진헌",
  phone: "01087717357",
  serviceEnd: "2026-10-01",
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
        {active === "auction-search" ? (
          <AuctionSearchPage />
        ) : (
          <ComingSoonPage tab={tab} />
        )}
      </main>

      <ExternalLinksFab />

      <Toaster theme={theme} />
    </div>
  )
}
