import { cn } from '@/lib/utils';
import * as React from 'react';
import { InlinePopover, PopoverContent, PopoverTrigger } from './InlinePopover';

export type Option = { value: string; label: string };

export const InlineSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, options, placeholder = 'Select…', className }) => {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <InlinePopover open={open} onOpenChange={setOpen}>
  <PopoverTrigger type="button" className={cn('w-full rounded border bg-background px-2 py-1 text-left', className)}>
        {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="max-h-56 w-full overflow-auto">
        <ul role="listbox" className="flex flex-col">
          {options.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={cn('w-full px-2 py-1 text-left hover:bg-accent', opt.value === value && 'bg-accent')}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </InlinePopover>
  );
};
