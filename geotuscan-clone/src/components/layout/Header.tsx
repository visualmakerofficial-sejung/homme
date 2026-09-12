import { useState } from "react"
import {
  Banknote,
  Bell,
  Calculator,
  LayoutGrid,
  LogOut,
  MessageSquare,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AptCalculatorDialog,
  DsrCalculatorDialog,
} from "@/components/dialogs/CalculatorDialogs"
import { BidCalculatorPanel } from "@/components/dialogs/BidCalculatorPanel"
import { YuchalAlarmDialog } from "@/components/dialogs/YuchalAlarmDialog"
import { InquiryDialog } from "@/components/dialogs/MiscDialogs"

export interface HeaderProps {
  memberName: string
  memberPhone: string
  serviceEnd: string
  onLogoClick?: () => void
}

/**
 * 원본 header: h-14 / border-b / bg-card, 좌측 로고 버튼 + 우측 액션 그룹.
 * 액션 라벨은 sm 미만에서 숨고 아이콘만 남는다(`hidden sm:inline`).
 */
export function Header({
  memberName,
  memberPhone,
  serviceEnd,
  onLogoClick,
}: HeaderProps) {
  const [aptOpen, setAptOpen] = useState(false)
  const [bidOpen, setBidOpen] = useState(false)
  const [dsrOpen, setDsrOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [inquiryOpen, setInquiryOpen] = useState(false)

  const initial = memberName.slice(0, 1)

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <button
        type="button"
        onClick={onLogoClick}
        className="flex cursor-pointer items-center"
      >
        <img
          src="/geotu-logo.svg"
          alt="거투스캔"
          width={140}
          height={48}
          loading="lazy"
          decoding="async"
          className="h-10 object-contain text-foreground"
        />
      </button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-[0.8rem]"
          onClick={() => setAptOpen(true)}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">아파트 계산기</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-[0.8rem]"
          onClick={() => setBidOpen(true)}
        >
          <Banknote className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">입찰계산기</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setDsrOpen(true)}>
          <Calculator className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">DSR</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setNoticeOpen(true)}>
          <Bell className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">알림</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setInquiryOpen(true)}>
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">문의</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {initial}
            </span>
            <span className="hidden text-sm sm:inline">{memberName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel>
              <span className="block text-sm font-semibold text-foreground">
                {memberName}
              </span>
              <span className="block text-xs text-muted-foreground">
                {memberPhone}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="justify-between text-xs">
              <span>이용 종료일</span>
              <span className="price-text text-foreground">{serviceEnd}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => toast("내 정보는 준비 중입니다.")}>
              <UserRound />내 정보
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => toast.success("로그아웃되었습니다.")}
            >
              <LogOut />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AptCalculatorDialog open={aptOpen} onOpenChange={setAptOpen} />
      <DsrCalculatorDialog open={dsrOpen} onOpenChange={setDsrOpen} />
      <YuchalAlarmDialog open={noticeOpen} onOpenChange={setNoticeOpen} />
      <BidCalculatorPanel open={bidOpen} onClose={() => setBidOpen(false)} />
      <InquiryDialog open={inquiryOpen} onOpenChange={setInquiryOpen} />
    </header>
  )
}
