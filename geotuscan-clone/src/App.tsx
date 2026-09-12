import { useState } from "react"
import { House } from "lucide-react"

import { Header } from "@/components/layout/Header"
import { MobileTabBar, TabNav } from "@/components/layout/TabNav"
import { ExternalLinksFab } from "@/components/layout/ExternalLinksFab"
import { Toaster } from "@/components/ui/sonner"
import { type TabId } from "@/data/nav"
import { useThemeMode } from "@/lib/theme"
import { AuctionSearchPage } from "@/features/auction-search/AuctionSearchPage"
import { AiReviewPage } from "@/features/ai-review/AiReviewPage"
import { AptDealsPage } from "@/features/apt-deals/AptDealsPage"
import { StatsPage } from "@/features/stats/StatsPage"
import { VillaDataPage } from "@/features/villa-data/VillaDataPage"

/**
 * 로그인 세션 표시용 값.
 *
 * 원본 스냅샷의 RSC 페이로드에는 실제 회원 이름과 휴대폰 번호가 그대로
 * 들어 있었다. 공개 저장소와 호스팅에 실제 개인정보를 올릴 이유가 없어
 * 데모값으로 바꿨다. 실제 인증을 붙일 때 이 상수를 세션에서 받아오면 된다.
 */
const MEMBER = {
  name: "홍길동",
  phone: "010-0000-0000",
  serviceEnd: "2026-10-01",
}

/**
 * 탭 → 화면. 6개 탭 스냅샷을 모두 받아 전부 구현됐다.
 * 아파트경쟁률/빌라경쟁률은 원본 마크업이 동일해서 StatsPage 하나를 공유한다.
 */
function renderTab(active: TabId) {
  switch (active) {
    case "auction-search":
      return <AuctionSearchPage />
    case "villa-data":
      return <VillaDataPage />
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
        {renderTab(active)}
      </main>

      <ExternalLinksFab />

      <Toaster theme={theme} />
    </div>
  )
}
