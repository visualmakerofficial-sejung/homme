import { useState } from "react"
import { Bell, Building2, House } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FilterPill } from "@/components/ui/filter-pill"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AREAS = ["서울", "경기", "인천", "지방"]

/**
 * 헤더 종 아이콘이 여는 다이얼로그. 알림 "목록"이 아니라 유찰 알림 **설정**이다.
 * (스냅샷 확인 전에는 공지 목록으로 잘못 만들어 뒀었다.)
 *
 * 스냅샷 기본값: 관심지역 서울·경기 선택, 관심부동산 아파트·빌라 둘 다 선택,
 * 알림 받기는 off, 최저가 범위는 비어 있음.
 */
export function YuchalAlarmDialog({ open, onOpenChange }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [areas, setAreas] = useState<string[]>(["서울", "경기"])
  const [kinds, setKinds] = useState<string[]>(["아파트", "빌라"])
  const [min, setMin] = useState("")
  const [max, setMax] = useState("")

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Bell className="h-4 w-4" />
            유찰알림
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-3 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">알림 받기</span>
                <p className="text-xs text-muted-foreground">
                  카카오톡 알림은 준비 중입니다
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="알림 받기"
              />
            </div>

            <div>
              <span className="mb-1 block text-xs text-muted-foreground">
                관심지역
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AREAS.map((area) => (
                  <FilterPill
                    key={area}
                    active={areas.includes(area)}
                    onClick={() => toggle(areas, setAreas, area)}
                  >
                    {area}
                  </FilterPill>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs text-muted-foreground">
                관심부동산
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { label: "아파트", Icon: Building2 },
                    { label: "빌라", Icon: House },
                  ] as const
                ).map(({ label, Icon }) => (
                  <FilterPill
                    key={label}
                    active={kinds.includes(label)}
                    onClick={() => toggle(kinds, setKinds, label)}
                    className="flex items-center gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </FilterPill>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs text-muted-foreground">
                최저가 범위 (만원)
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="최소"
                  aria-label="최저가 최소"
                  className="h-7 flex-1 text-xs"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">~</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="최대"
                  aria-label="최저가 최대"
                  className="h-7 flex-1 text-xs"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="py-4 text-center text-xs text-muted-foreground">
            설정한 조건에 맞는 유찰 물건이 카카오톡으로 알림됩니다
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
