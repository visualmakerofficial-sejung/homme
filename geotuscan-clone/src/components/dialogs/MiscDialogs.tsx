import { useState } from "react"
import { Bell, MessageSquare, Send } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* 스냅샷에는 다이얼로그가 닫힌 상태라 내용은 예시로 채웠다. */
const NOTICES = [
  {
    id: 1,
    tag: "업데이트",
    title: "빌라 실거래 데이터 9월분 반영",
    date: "9.11",
    unread: true,
  },
  {
    id: 2,
    tag: "공지",
    title: "추석 연휴 기간 경매 일정 안내",
    date: "9.8",
    unread: true,
  },
  {
    id: 3,
    tag: "점검",
    title: "9월 3일 02:00~04:00 서버 점검",
    date: "9.1",
    unread: false,
  },
]

export function NotificationsDialog({ open, onOpenChange }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
            알림
          </DialogTitle>
          <DialogDescription>
            서비스 공지와 데이터 갱신 내역입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {NOTICES.map((n) => (
            <div
              key={n.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary data-[read=true]:bg-transparent"
                data-read={!n.unread}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-5 shrink-0 text-[10px]">
                    {n.tag}
                  </Badge>
                  <p className="truncate text-xs text-muted-foreground">
                    {n.date}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium">{n.title}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function InquiryDialog({ open, onOpenChange }: DialogProps) {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const canSubmit = subject.trim().length > 0 && body.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    toast.success("문의가 접수되었습니다.", {
      description: "영업일 기준 1일 내에 답변드립니다.",
    })
    setSubject("")
    setBody("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            문의하기
          </DialogTitle>
          <DialogDescription>
            데이터 오류나 기능 요청을 남겨 주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              제목
            </span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="예) 2025-506797 감정가가 다릅니다"
              className="h-10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              내용
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="자세한 내용을 적어 주세요."
              className="w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </label>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit} className="h-10 px-4">
              <Send className="h-4 w-4" />
              보내기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
