import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

// Lightweight inline Select without portals

type Option = { value: string; label: React.ReactNode }

const SelectContext = React.createContext<{
  open: boolean
  setOpen: (v: boolean) => void
  value?: string
  onValueChange?: (v: string) => void
  options: Option[]
  setOptions: React.Dispatch<React.SetStateAction<Option[]>>
} | null>(null)

const Select: React.FC<{
  value?: string
  onValueChange?: (v: string) => void
  defaultOpen?: boolean
  children: React.ReactNode
}> = ({ value, onValueChange, defaultOpen, children }) => {
  const [open, setOpen] = React.useState(!!defaultOpen)
  const [options, setOptions] = React.useState<Option[]>([])
  return (
    <SelectContext.Provider
      value={{ open, setOpen, value, onValueChange, options, setOptions }}
    >
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  )
}

const useSelect = () => {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error("Select components must be used within <Select>")
  return ctx
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  function SelectTrigger({ className, children, onClick, ...props }, ref) {
    const { open, setOpen } = useSelect()
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-[calc(var(--radius)-2px)] border border-input bg-background/80 px-3 text-[12px] ring-offset-background placeholder:text-muted-foreground/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/80 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          onClick?.(e)
          setOpen(!open)
        }}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)

const SelectValue: React.FC<{ placeholder?: React.ReactNode }> = ({
  placeholder,
}) => {
  const { value, options } = useSelect()
  const opt = options.find((o) => o.value === value)
  return (
    <span className="line-clamp-1 text-left flex-1 mr-2">
      {opt ? opt.label : placeholder}
    </span>
  )
}

const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const { open } = useSelect()
  if (!open) return null
  return (
    <div
      role="listbox"
      className={cn(
        "absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none p-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  { value: string } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  function SelectItem({ value, className, children, onClick, ...props }, ref) {
    const { value: cur, onValueChange, setOpen, setOptions } = useSelect()
    // collect options for SelectValue
    React.useEffect(() => {
      setOptions((prev: Option[]) => {
        if (prev.some((p: Option) => p.value === value)) return prev
        return [...prev, { value, label: children } as Option]
      })
    }, [value, children, setOptions])
    const selected = cur === value
    return (
      <button
        ref={ref}
        type="button"
        role="option"
        aria-selected={selected}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-[12px] outline-none hover:bg-secondary/60 hover:text-foreground",
          selected && "bg-primary/10 text-primary",
          className
        )}
        onClick={(e) => {
          onClick?.(e)
          onValueChange?.(value)
          setOpen(false)
        }}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {selected ? <Check className="h-4 w-4" /> : null}
        </span>
        <span className="truncate">{children}</span>
      </button>
    )
  }
)

const SelectGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-1">{children}</div>
)
const SelectSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />
)

export {
    Select, SelectContent, SelectGroup, SelectItem,
    SelectSeparator, SelectTrigger, SelectValue
};
 
// Extended item with trailing action (e.g., delete icon)
const SelectItemAction = (
  {
    value,
    children,
    action,
    onActionClick,
    className,
  }: {
    value: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    onActionClick?: () => void;
    className?: string;
  }
) => {
  const { value: cur, onValueChange, setOpen, setOptions } = useSelect();
  React.useEffect(() => {
    setOptions((prev: Option[]) => {
      if (prev.some((p: Option) => p.value === value)) return prev;
      return [...prev, { value, label: children } as Option];
    });
  }, [value, children, setOptions]);
  const selected = cur === value;
  return (
    <div
      role="option"
      aria-selected={selected}
      className={cn(
        "relative flex w-full items-center rounded-md py-1 pl-1 pr-1 text-[12px] outline-none hover:bg-secondary/60 hover:text-foreground",
        selected && "bg-primary/10 text-primary",
        className
      )}
    >
      <button
        type="button"
        className={cn(
          "flex-1 flex items-center rounded-md py-0.5 pl-7 pr-2 text-left truncate"
        )}
        onClick={() => {
          onValueChange?.(value);
          setOpen(false);
        }}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {selected ? <Check className="h-4 w-4" /> : null}
        </span>
        <span className="truncate">{children}</span>
      </button>
      {action && (
        <button
          type="button"
          className="ml-1 inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted/50"
          onClick={(e) => {
            e.stopPropagation();
            onActionClick?.();
          }}
          aria-label="action"
        >
          {action}
        </button>
      )}
    </div>
  );
};

export { SelectItemAction };
