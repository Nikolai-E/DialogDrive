import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius)] text-[12px] font-medium tracking-tight ring-offset-background transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-ring active:translate-y-[0.5px] active:shadow-inner",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-secondary/70 hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-[11.5px]",
        xs: "h-6 px-2 text-[11px]",
        lg: "h-9 px-4 text-[13px]",
        icon: "h-8 w-8",
      },
      // apply a consistent gap between icon and label when needed
      withIcon: {
        true: "gap-2",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, withIcon, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    // Ensure buttons do not default to type="submit" when used inside forms
    const { type, ...rest } = props as React.ButtonHTMLAttributes<HTMLButtonElement>
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, withIcon, className }))}
        ref={ref}
        // Default to a safe non-submitting button unless explicitly overridden
        {...(!asChild ? { type: (type as any) ?? 'button' } : {})}
        {...(rest as any)}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
