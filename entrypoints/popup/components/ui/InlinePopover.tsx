import * as React from 'react';
import { cn } from '@/lib/utils';

export const InlinePopoverContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
} | null>(null);

export const InlinePopover: React.FC<{ open?: boolean; defaultOpen?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }>= ({ open: controlled, defaultOpen, onOpenChange, children }) => {
  const [uOpen, setUOpen] = React.useState(!!defaultOpen);
  const isCtrl = controlled !== undefined;
  const open = isCtrl ? !!controlled : uOpen;
  const setOpen = (v: boolean) => { if (!isCtrl) setUOpen(v); onOpenChange?.(v); };
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  return (
    <InlinePopoverContext.Provider value={{ open, setOpen, anchorRef }}>
      {children}
    </InlinePopoverContext.Provider>
  );
};

const useCtx = () => {
  const ctx = React.useContext(InlinePopoverContext);
  if (!ctx) throw new Error('InlinePopover.* must be used within InlinePopover');
  return ctx;
};

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function PopoverTrigger({ onClick, ...props }, ref) {
  const { setOpen, anchorRef } = useCtx();
  const setRefs = (node: HTMLButtonElement | null) => {
    // update internal ref
    (anchorRef as any).current = node;
    // update forwarded ref
    if (typeof ref === 'function') ref(node);
    else if (ref && 'current' in (ref as any)) (ref as any).current = node;
  };
  return (
    <button ref={setRefs} {...props} onClick={(e) => { onClick?.(e); setOpen(true); }} />
  );
});

export const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function PopoverContent({ className, style, ...props }, ref) {
  const { open, setOpen, anchorRef } = useCtx();
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number }>({ left: 0, top: 0, width: 0 });

  React.useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const parent = anchor?.closest<HTMLElement>('[data-inline-popover-root]') || anchor?.parentElement;
    if (!anchor || !parent) return;
    const a = anchor.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    setPos({ left: a.left - p.left, top: a.bottom - p.top + 4, width: a.width });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div data-inline-popover-root className="relative">
      <div
        ref={ref}
        className={cn('absolute z-50 rounded-md border bg-popover p-2 shadow-md', className)}
        style={{ left: pos.left, top: pos.top, minWidth: pos.width, ...style }}
        {...props}
      />
    </div>
  );
});
