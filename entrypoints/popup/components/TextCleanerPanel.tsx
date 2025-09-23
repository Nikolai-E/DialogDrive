import { motion } from 'framer-motion';
import { ClipboardCopy, Eraser } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { secureStorage } from '../../../lib/secureStorageV2';
import { cleanText, defaultCleanOptions, type CleanOptions } from '../../../lib/textCleaner';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

export const TextCleanerPanel: React.FC = () => {
  const { setCurrentView } = useUnifiedStore();
  const [raw, setRaw] = useState('');
  const [opts, setOpts] = useState<CleanOptions>({
    ...defaultCleanOptions,
    normalizeUnicode: true,
    normalizeWhitespace: true,
    normalizePunctuation: true,
    stripInvisible: true,
    preserveCodeBlocks: true,
    stripNonKeyboardSymbols: false,
    flattenMarkdown: false,
    redactURLs: false,
    transliterateDiacritics: false,
    removeAIMarkers: { conservative: true, aggressive: false },
    debug: false,
  });

  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const result = useMemo(() => cleanText(raw, opts), [raw, opts]);

  const toggleKey = (key: keyof CleanOptions) => () =>
    setOpts((o) => ({ ...o, [key]: !(o as any)[key] } as CleanOptions));

  // Load saved cleaner options on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const prefs = (await secureStorage.getPreferences<any>()) || {};
        const saved = prefs?.cleanerOptions as Partial<CleanOptions> | undefined;
        if (alive && saved) {
          setOpts((o) => ({
            ...o,
            ...saved,
            removeAIMarkers: {
              conservative: saved.removeAIMarkers?.conservative ?? o.removeAIMarkers.conservative,
              aggressive: saved.removeAIMarkers?.aggressive ?? o.removeAIMarkers.aggressive,
            },
            ellipsisMode: (saved as any).ellipsisMode ?? o.ellipsisMode,
          }));
        }
      } catch {
        // ignore
      }
    })();
    return () => { alive = false; };
  }, []);

  // Persist cleaner options when they change (lightweight object)
  useEffect(() => {
    const toSave = {
      normalizeUnicode: opts.normalizeUnicode,
      stripInvisible: opts.stripInvisible,
      normalizeWhitespace: opts.normalizeWhitespace,
      normalizePunctuation: opts.normalizePunctuation,
      stripNonKeyboardSymbols: opts.stripNonKeyboardSymbols,
      transliterateDiacritics: opts.transliterateDiacritics,
      flattenMarkdown: opts.flattenMarkdown,
      preserveCodeBlocks: opts.preserveCodeBlocks,
      redactURLs: opts.redactURLs,
      removeAIMarkers: opts.removeAIMarkers,
      ellipsisMode: opts.ellipsisMode,
    } as Partial<CleanOptions>;

    (async () => {
      try {
        const prefs = (await secureStorage.getPreferences<any>()) || {};
        await secureStorage.setPreferences({ ...prefs, cleanerOptions: toSave });
      } catch {
        // ignore
      }
    })();
  }, [opts.normalizeUnicode, opts.stripInvisible, opts.normalizeWhitespace, opts.normalizePunctuation, opts.stripNonKeyboardSymbols, opts.transliterateDiacritics, opts.flattenMarkdown, opts.preserveCodeBlocks, opts.redactURLs, opts.removeAIMarkers.conservative, opts.removeAIMarkers.aggressive, opts.ellipsisMode]);

  return (
    <div className="relative flex flex-col h-full text-[12px]">
      {/* Compact two-line header with actions and option pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="px-2 py-1 border-b bg-background/80"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold">Cleaner</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="xs" variant="outline" withIcon onClick={() => setRaw('')}>
              <Eraser className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button size="xs" withIcon className="bg-foreground text-white hover:opacity-90" onClick={() => copyToClipboard(result.text)} disabled={!result.text}>
              <ClipboardCopy className="h-3.5 w-3.5" /> {isCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <TogglePill active={opts.normalizeUnicode} onClick={toggleKey('normalizeUnicode')}>Unicode</TogglePill>
          <TogglePill active={opts.normalizeWhitespace} onClick={toggleKey('normalizeWhitespace')}>Whitespace</TogglePill>
          <TogglePill active={opts.normalizePunctuation} onClick={toggleKey('normalizePunctuation')}>Punct</TogglePill>
          <TogglePill active={opts.stripInvisible} onClick={toggleKey('stripInvisible')}>Invisible</TogglePill>
          <TogglePill active={opts.preserveCodeBlocks} onClick={toggleKey('preserveCodeBlocks')}>Code</TogglePill>
          <TogglePill
            active={opts.removeAIMarkers.conservative}
            onClick={() => setOpts((o) => ({ ...o, removeAIMarkers: { ...o.removeAIMarkers, conservative: !o.removeAIMarkers.conservative } }))}
          >
            AI
          </TogglePill>
          <div className="ml-1 inline-flex items-center gap-1">
            <span className="text-muted-foreground">Ellipsis</span>
            <div className="inline-flex rounded-md border border-input overflow-hidden">
              <Button size="xs" variant={opts.ellipsisMode === 'dots' ? 'secondary' : 'outline'} className="h-6 px-2 text-foreground" onClick={() => setOpts((o) => ({ ...o, ellipsisMode: 'dots' }))}>...</Button>
              <Button size="xs" variant={opts.ellipsisMode === 'dot' ? 'secondary' : 'outline'} className="h-6 px-2 text-foreground" onClick={() => setOpts((o) => ({ ...o, ellipsisMode: 'dot' }))}>.</Button>
            </div>
          </div>
          <div className="ml-auto text-[11px] text-muted-foreground">
            {result.report.changes} changes in {result.report.elapsedMs} ms
          </div>
        </div>
      </motion.div>

      {/* Vertical layout: Input on first row (smaller), Cleaned on second row (expands) */}
      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        <div className="flex flex-col">
          <Label htmlFor="raw" className="mb-1">Input</Label>
          <Textarea id="raw" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste text here" className="h-32 text-[12px]" />
        </div>
        <div className="flex flex-col min-h-0 flex-1">
          <Label htmlFor="clean" className="mb-1">Cleaned</Label>
          {/* Diff-highlighted view layered under a transparent textarea for easy copying and selection */}
          <div className="relative flex-1 min-h-[200px]">
            <div className="absolute inset-0 overflow-auto rounded-md border border-input bg-muted/30 p-2 text-[12px] whitespace-pre-wrap font-mono leading-5" aria-hidden>
              <DiffView original={raw} cleaned={result.text} />
            </div>
            <Textarea id="clean" value={result.text} readOnly className="absolute inset-0 opacity-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextCleanerPanel;

// Small pill-like toggle built from Button
const TogglePill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <Button
    size="xs"
    variant={active ? 'secondary' : 'outline'}
    className="h-6 px-2 text-foreground"
    onClick={onClick}
  >
    {children}
  </Button>
);

// Lightweight word-level diff view highlighting changes in the cleaned text
const DiffView: React.FC<{ original: string; cleaned: string }> = ({ original, cleaned }) => {
  const cleanedTokens = React.useMemo(() => splitTokens(cleaned), [cleaned]);
  const cleanedWords = React.useMemo(() => cleanedTokens.filter(t => !t.ws).map(t => t.text), [cleanedTokens]);
  const originalWords = React.useMemo(() => splitTokens(original).filter(t => !t.ws).map(t => t.text), [original]);
  const matchedMask = React.useMemo(() => lcsMask(originalWords, cleanedWords), [originalWords, cleanedWords]);

  let wordIdx = 0;
  return (
    <span>
      {cleanedTokens.map((tok, i) => {
        if (tok.ws) return <span key={i}>{tok.text}</span>;
        const isMatch = matchedMask[wordIdx++] ?? false;
        if (isMatch) return <span key={i}>{tok.text}</span>;
        return (
          <span key={i} className="bg-amber-400/25 outline outline-1 outline-amber-500/30 rounded-sm">
            {tok.text}
          </span>
        );
      })}
    </span>
  );
};

type Token = { text: string; ws: boolean };
function splitTokens(s: string): Token[] {
  if (!s) return [];
  const parts = s.split(/(\s+)/);
  const out: Token[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (/^\s+$/.test(p)) out.push({ text: p, ws: true });
    else out.push({ text: p, ws: false });
  }
  return out;
}

// LCS mask for cleaned words vs original words
function lcsMask(a: string[], b: string[]): boolean[] {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1; else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const mask = new Array<boolean>(m).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { mask[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return mask;
}
