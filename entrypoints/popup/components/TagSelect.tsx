import { Check, ChevronDown, X } from 'lucide-react';
import React from 'react';

type Props = {
  allTags: string[];
  value: string[];
  onChange: (next: string[]) => void;
  onDeleteTag: (tag: string) => void;
  className?: string;
};

const TagSelect: React.FC<Props> = ({ allTags, value, onChange, onDeleteTag, className }) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !contentRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (tag: string) => {
    const exists = value.includes(tag);
    onChange(exists ? value.filter(t => t !== tag) : [...value, tag]);
  };

  const label = value.length === 0 ? 'Select tags' : `${value.length} selected`;

  return (
    <div className={["relative inline-block w-full", className].filter(Boolean).join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-[12px] ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onClick={() => setOpen(v => !v)}
      >
        <span className="line-clamp-1 text-left flex-1 mr-2 text-foreground/90">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div
          ref={contentRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none p-1"
        >
          {allTags.length === 0 && (
            <div className="text-[11px] text-muted-foreground p-2">No tags</div>
          )}
          {allTags.map((tag) => {
            const selected = value.includes(tag);
            return (
              <div key={tag} className="group flex items-center gap-1 px-2 h-7 text-[11px] rounded hover:bg-accent/10">
                <button
                  type="button"
                  onClick={() => toggle(tag)}
                  className="flex-1 text-left truncate inline-flex items-center gap-1"
                >
                  {selected && <Check className="h-3 w-3 text-green-600" />}
                  {tag}
                </button>
                <button
                  type="button"
                  aria-label={`Delete tag ${tag}`}
                  className="opacity-60 hover:opacity-100 text-red-600 p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete tag "${tag}" from all items?`)) {
                      onDeleteTag(tag);
                      onChange(value.filter(t => t !== tag));
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TagSelect;
