import { TABS, type TabId } from "@/data/nav"
import { cn } from "@/lib/utils"

interface TabNavProps {
  active: TabId
  onChange: (id: TabId) => void
}

/**
 * 데스크톱 탭바 (md 이상). 활성 탭은 text-primary + 하단 2px 인디케이터.
 * 인디케이터는 `absolute bottom-0 left-3 right-3 h-0.5`로 라벨보다 살짝 좁다.
 */
export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="hidden border-b bg-card md:block">
      <div className="mx-auto flex max-w-5xl">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors hover:text-primary",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {isActive && (
                <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * 모바일 하단 탭바 (md 미만). 반투명 + backdrop-blur로 본문 위에 떠 있고,
 * 활성 탭 인디케이터는 데스크톱과 반대로 상단에 붙는다.
 */
export function MobileTabBar({ active, onChange }: TabNavProps) {
  return (
    <nav className="safe-area-bottom fixed right-0 bottom-0 left-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-primary/70",
              )}
            >
              {isActive && (
                <span className="absolute top-0 right-4 left-4 h-0.5 rounded-full bg-primary" />
              )}
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] leading-tight font-medium">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
