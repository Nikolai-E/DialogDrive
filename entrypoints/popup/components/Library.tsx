import { Check, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';

type LibraryPrompt = {
  title: string;
  text: string;
  tags?: string[];
  workspace?: string;
};

// Premade library items. For now we mirror the old defaults.
const PREMADE: LibraryPrompt[] = [
  {
    title: 'Summarize this article',
    text: 'Please provide a concise summary of the following article: [paste article here]',
    tags: ['summary', 'article'],
    workspace: 'Research',
  },
  {
    title: "Explain like I'm 5",
    text: "Explain the following concept to me as if I were a 5-year-old: [paste concept here]",
    tags: ['simple', 'explanation'],
    workspace: 'Education',
  },
  {
    title: 'Code review request',
    text: 'Please review this code for best practices, potential bugs, and suggestions for improvement:\n\n[paste code here]',
    tags: ['code', 'review'],
    workspace: 'Development',
  },
  {
    title: 'Bug report template',
    text: 'Use this structure to write clear, reproducible bug reports.\n\nTitle: [brief summary]\nEnvironment: [OS, browser, app version]\nSteps to Reproduce:\n1) [first step]\n2) [second step]\nExpected: [what should happen]\nActual: [what happens]\nNotes: [logs, screenshots, links]',
    tags: ['qa', 'template'],
    workspace: 'Development',
  },
];

export const Library: React.FC = () => {
  const { prompts, addPrompt } = useUnifiedStore();
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  const byTitle = useMemo(() => new Set(prompts.map((p) => p.title.trim().toLowerCase())), [prompts]);

  const handleAdd = async (idx: number, p: LibraryPrompt) => {
    if (addingIndex !== null) return;
    setAddingIndex(idx);
    try {
      await addPrompt({
        title: p.title,
        text: p.text,
        workspace: p.workspace || 'General',
        tags: p.tags || [],
        isPinned: false,
        usageCount: 0,
        includeTimestamp: false,
      } as any);
    } finally {
      setAddingIndex(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-2 pt-2 pb-1 border-b">
        <h2 className="text-[13px] font-semibold">Prompt Library</h2>
        <p className="text-[11px] text-muted-foreground">Curated, ready-to-use prompts you can add to your collection.</p>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {PREMADE.map((p, idx) => {
          const added = byTitle.has(p.title.trim().toLowerCase());
          return (
            <div key={idx} className="rounded-md border border-border bg-card p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[12px] font-medium text-foreground truncate" title={p.title}>{p.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-3">{p.text}</p>
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span key={t} className="inline-flex items-center rounded bg-muted/40 border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    withIcon
                    onClick={() => handleAdd(idx, p)}
                    disabled={added || addingIndex === idx}
                    aria-pressed={added}
                    aria-label={added ? 'Selected' : `Select ${p.title}`}
                    className="min-w-[108px] justify-center bg-black text-white hover:bg-black/90 border border-black"
                  >
                    {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {added ? 'Selected' : addingIndex === idx ? 'Selecting…' : 'Select'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {PREMADE.length === 0 && (
          <div className="text-center text-[12px] text-muted-foreground py-6">No library items available.</div>
        )}
      </div>
    </div>
  );
};

export default Library;
