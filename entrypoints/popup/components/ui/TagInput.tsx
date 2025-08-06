import * as React from 'react';
import { cn } from '@/lib/utils';

export const TagInput: React.FC<{
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Add tag and press Enter', className }) => {
  const [input, setInput] = React.useState('');
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      const t = input.trim();
      if (!value.includes(t)) onChange([...value, t]);
      setInput('');
      e.preventDefault();
    }
    if (e.key === 'Backspace' && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className={cn('flex flex-wrap items-center gap-1 rounded border px-2 py-1', className)}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
          {t}
          <button aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="opacity-70 hover:opacity-100">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="min-w-[8ch] flex-1 bg-transparent p-1 outline-none"
      />
    </div>
  );
};
