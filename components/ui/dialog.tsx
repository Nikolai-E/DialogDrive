import { cn } from "@/lib/utils"
import * as React from "react"

// Simple inline Dialog implementation without portals
// Keeps everything inside the popup DOM to avoid positioning glitches.

type DialogRootProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const DialogContext = React.createContext<{
  open: boolean
  setOpen: (v: boolean) => void
  containerRef: React.RefObject<HTMLDivElement>
} | null>(null)

const Dialog: React.FC<DialogRootProps> = ({
  open: controlled,
  defaultOpen,
  onOpenChange,
  children,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(!!defaultOpen)
  const isControlled = controlled !== undefined
  const open = isControlled ? !!controlled : uncontrolledOpen
  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v)
    onOpenChange?.(v)
  }

  // The local container that bounds overlay and content (prevents body portal issues)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on Escape when open and focus is within container
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
      }
    }
    const node = containerRef.current
    node?.addEventListener("keydown", onKeyDown as any)
    return () => node?.removeEventListener("keydown", onKeyDown as any)
  }, [open])

  // Simple focus trap when dialog opens (cycles focus within dialog content)
  const previouslyFocused = React.useRef<Element | null>(null)
  React.useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement
      // try focus first focusable inside content
      const container = containerRef.current
      const content = container?.querySelector<HTMLElement>("[data-dd-dialog-content]")
      const focusables = content?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusables && focusables[0]
      first?.focus()
    } else {
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus()
      }
    }
  }, [open])

  // Prevent scroll on underlying container only (not document body)
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (open) {
      el.style.overflow = "hidden"
    } else {
      el.style.overflow = ""
    }
    return () => {
      if (el) el.style.overflow = ""
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <DialogContext.Provider value={{ open, setOpen, containerRef }}>
        {children}
      </DialogContext.Provider>
    </div>
  )
}

const useDialogCtx = () => {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog components must be used within <Dialog>")
  return ctx
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  function DialogTrigger({ onClick, ...props }, ref) {
    const { setOpen } = useDialogCtx()
    return (
      <button
        type="button"
        ref={ref}
        {...props}
        onClick={(e) => {
          onClick?.(e)
          setOpen(true)
        }}
        aria-haspopup="dialog"
      />
    )
  }
)
DialogTrigger.displayName = "DialogTrigger"

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  function DialogClose({ onClick, ...props }, ref) {
    const { setOpen } = useDialogCtx()
    return (
      <button
        type="button"
        ref={ref}
        {...props}
        onClick={(e) => {
          onClick?.(e)
          setOpen(false)
        }}
      />
    )
  }
)
DialogClose.displayName = "DialogClose"

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(
  function DialogOverlay({ className, ...props }, ref) {
    const { open, setOpen } = useDialogCtx()
    if (!open) return null
    return (
      <div
        ref={ref}
        className={cn("absolute inset-0 z-40 bg-black/40", className)}
        onClick={() => setOpen(false)}
        aria-hidden="true"
        {...props}
      />
    )
  }
)
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(
  function DialogContent({ className, children, ...props }, ref) {
    const { open } = useDialogCtx()
    if (!open) return null
    return (
      <div className="relative z-50">
        <DialogOverlay />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          data-dd-dialog-content
          className={cn(
            "absolute left-1/2 top-1/2 w-[calc(100%-16px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow-lg",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(
  function DialogTitle({ className, ...props }, ref) {
    return (
      <h2
        ref={ref}
        className={cn(
          "text-lg font-semibold leading-none tracking-tight",
          className
        )}
        {...props}
      />
    )
  }
)
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(
  function DialogDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      />
    )
  }
)
DialogDescription.displayName = "DialogDescription"

export {
    Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle, DialogTrigger
}

