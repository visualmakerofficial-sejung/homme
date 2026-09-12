import { useEffect, useState } from "react"

export type ThemeMode = "light" | "dark" | "system"

/**
 * 원본 헤더에는 테마 토글이 없고, 스냅샷의 <html>에도 class="dark"가 없다.
 * 반면 마크업 전반에는 `dark:` 변형이 깔려 있어 다크 팔레트 자체는 준비돼 있다.
 * 둘 중 어느 쪽이 원본 동작인지는 스냅샷만으로 단정할 수 없어서,
 * **눈에 보이는 증거(라이트 화면)** 를 그대로 따라 light로 고정해 뒀다.
 *
 * 시스템 설정을 따르게 하려면 "system", 항상 다크면 "dark"로 바꾸면 된다.
 * src/index.css의 .dark 블록이 그때부터 적용된다.
 */
export const THEME_MODE: ThemeMode = "light"

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

/** `.dark` 클래스를 <html>에 동기화하고 확정된 테마를 돌려준다. */
export function useThemeMode(mode: ThemeMode = THEME_MODE) {
  const [theme, setTheme] = useState<"light" | "dark">(() => resolve(mode))

  useEffect(() => {
    const apply = () => setTheme(resolve(mode))
    apply()

    if (mode !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [mode])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
  }, [theme])

  return theme
}
