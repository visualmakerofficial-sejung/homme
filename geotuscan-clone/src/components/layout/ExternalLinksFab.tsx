import { useState } from "react"
import { ExternalLink, Link2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** 스냅샷에는 링크 목록이 열려 있지 않아 항목은 대표 사이트로 채워 뒀다. */
const REFERENCE_SITES = [
  { label: "대법원 법원경매정보", href: "https://www.courtauction.go.kr" },
  { label: "국토교통부 실거래가", href: "https://rt.molit.go.kr" },
  { label: "정부24 등기·대장 열람", href: "https://www.gov.kr" },
  { label: "일사편리 부동산정보", href: "https://kras.go.kr" },
  { label: "네이버 부동산", href: "https://land.naver.com" },
]

/**
 * 원본 FAB: 모바일에서는 하단 탭바를 피해 bottom-20,
 * md 이상에서는 bottom-6로 내려온다. hover에서 105%, 누르면 95%.
 */
export function ExternalLinksFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="참고 사이트 열기"
        title="참고 사이트"
        className="fixed right-4 bottom-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
      >
        <Link2 className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
              참고 사이트
            </DialogTitle>
            <DialogDescription>
              경매 분석에 자주 쓰는 외부 사이트를 새 탭으로 엽니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {REFERENCE_SITES.map((site) => (
              <a
                key={site.href}
                href={site.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <span className="truncate font-medium">{site.label}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
