import { useState } from "react"
import { MessageSquare, Send } from "lucide-react"
import { toast } from "sonner"

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
