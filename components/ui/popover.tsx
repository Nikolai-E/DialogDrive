"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple inline Popover (no portals)

const PopoverContext = React.createContext<{
  open: boolean
  setOpen: (v: boolean) => void
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>
} | null>(null)

const Popover: React.FC<{ defaultOpen?: boolean; open?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }>
= ({ defaultOpen, open: controlled, onOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(!!defaultOpen)
  const open = controlled ?? uncontrolledOpen
  const setOpen = (v: boolean) => { if (controlled === undefined) setUncontrolledOpen(v); onOpenChange?.(v) }
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

const usePopover = () => {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) throw new Error("Popover components must be used within <Popover>")
  return ctx
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function PopoverTrigger({ className, onClick, ...props }, ref) {
    const { open, setOpen, triggerRef } = usePopover()
    return (
      <button
        ref={(node) => { (ref as any)?.(node); triggerRef.current = node }}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => { onClick?.(e); setOpen(!open) }}
        {...props}
      />
    )
  }
)

const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function PopoverContent({ className, style, children, ...props }, ref) {
    const { open } = usePopover()
    if (!open) return null
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none",
          "min-w-56 max-w-sm",
          className
        )}
        style={{ marginTop: 6, ...style }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

export { Popover, PopoverTrigger, PopoverContent }
