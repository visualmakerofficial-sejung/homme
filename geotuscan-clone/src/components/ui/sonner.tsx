import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * 원본은 sonner 기본 팔레트(회색 스케일 하드코딩)를 그대로 쓰지 않고
 * 앱 토큰 위에 올려 둔다. 여기서도 --normal-* 을 디자인 토큰에 연결해
 * 색상 블록만 바꾸면 토스트까지 같이 따라오게 했다.
 */
export function Toaster({ theme = "light", ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-center"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "text-sm",
          description: "text-xs text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}
