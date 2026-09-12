import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * 원본 뱃지는 `rounded-4xl`(=2rem) 캡슐 형태에 `[&>svg]:size-3!`로
 * 내부 아이콘 크기를 강제한다.
 */
const badgeVariants = cva(
  [
    "group/badge inline-flex w-fit items-center justify-center gap-1 overflow-hidden",
    "rounded-4xl border px-2 py-0.5 font-medium whitespace-nowrap transition-all",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "dark:aria-invalid:ring-destructive/40",
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a]:hover:bg-destructive/80",
      },
      size: {
        default: "h-5 text-[10px]",
        sm: "h-4 px-1.5 text-[10px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "default"}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
