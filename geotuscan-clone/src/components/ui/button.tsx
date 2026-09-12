import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 원본 마크업에서 그대로 추출한 클래스 문자열.
 * `group/button`, `active:translate-y-px`, `focus-visible:ring-3`,
 * `aria-invalid:*`, `[&_svg]:*` 조합이 원본 버튼의 시각/모션 정체성이다.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center",
    "border border-transparent bg-clip-padding font-medium whitespace-nowrap",
    "transition-all outline-none select-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
    "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
          "rounded-lg gap-1.5",
          "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
          "[&_svg:not([class*='size-'])]:size-4",
        ].join(" "),
        ghost: [
          "hover:bg-muted hover:text-foreground",
          "aria-expanded:bg-muted aria-expanded:text-foreground",
          "dark:hover:bg-muted/50",
          "rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
          "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
          "[&_svg:not([class*='size-'])]:size-3.5",
        ].join(" "),
        outline: [
          "border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
          "dark:bg-input/30 dark:hover:bg-input/50",
          "rounded-lg gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          "rounded-lg gap-1.5 [&_svg:not([class*='size-'])]:size-4",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 gap-1.5 px-2.5 text-xs",
        xs: "h-7 gap-1 px-2.5 text-xs",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
