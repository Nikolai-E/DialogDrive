import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardCopy, Eraser } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { cleanText, defaultCleanOptions, type CleanOptions } from '../../../lib/textCleaner';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { secureStorage } from '../../../lib/secureStorageV2';

export const TextCleanerPanel: React.FC = () => {
  const { setCurrentView } = useUnifiedStore();
  const [raw, setRaw] = useState('');
  // Simplified UI: no separate Advanced/Removed/Invisibles toggles
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
    styleSmoothDiscourse: false,
    aiPhraseBlacklist: [],
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
            styleSmoothDiscourse: (saved as any).styleSmoothDiscourse ?? o.styleSmoothDiscourse,
            aiPhraseBlacklist: (saved as any).aiPhraseBlacklist ?? o.aiPhraseBlacklist,
            whitespacePolicy: (saved as any).whitespacePolicy ?? (o as any).whitespacePolicy,
          }));
          // aiPhraseBlacklist loaded into opts; no direct input UI here
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
      styleSmoothDiscourse: opts.styleSmoothDiscourse,
      aiPhraseBlacklist: opts.aiPhraseBlacklist,
      whitespacePolicy: (opts as any).whitespacePolicy,
    } as Partial<CleanOptions>;

    (async () => {
      try {
        const prefs = (await secureStorage.getPreferences<any>()) || {};
        await secureStorage.setPreferences({ ...prefs, cleanerOptions: toSave });
      } catch {
        // ignore
      }
    })();
  }, [opts.normalizeUnicode, opts.stripInvisible, opts.normalizeWhitespace, opts.normalizePunctuation, opts.stripNonKeyboardSymbols, opts.transliterateDiacritics, opts.flattenMarkdown, opts.preserveCodeBlocks, opts.redactURLs, opts.removeAIMarkers.conservative, opts.removeAIMarkers.aggressive, opts.ellipsisMode, (opts as any).whitespacePolicy]);

  // Aggregated rule counts for chips
  const rc = result.report.ruleCounts;
  const countAI = (rc['ai:conservative'] || 0) + (rc['ai:aggressive'] || 0);
  const countWS = (rc['map:nbsp-to-space'] || 0) + (rc['ws:collapse-inline'] || 0) + (rc['ws:collapse-blank-lines'] || 0) + (rc['ws:final-pass'] || 0);
  const countPunct = (rc['punct:quotes']||0)+(rc['punct:dashes']||0)+(rc['punct:ellipsis']||0)+(rc['punct:bullets']||0)+(rc['punct:fractions']||0)+(rc['punct:fullwidth-ascii']||0);
  const countURLs = (rc['redact:url']||0)+(rc['redact:email']||0);
  const countMD = (rc['md:flatten-headings']||0)+(rc['md:flatten-emphasis']||0)+(rc['md:flatten-lists']||0)+(rc['md:flatten-links']||0)+(rc['md:flatten-images']||0)+(rc['md:strip-inline-code']||0);
  const countSymbols = (rc['symbols:strip-nonkeyboard']||0);

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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCurrentView('list')}
              aria-label="Back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
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
          <TogglePill
            active={opts.normalizeWhitespace}
            onClick={() => setOpts((o: any) => ({ ...o, normalizeWhitespace: !o.normalizeWhitespace, stripInvisible: !o.normalizeWhitespace }))}
          >
            Whitespace
          </TogglePill>
          <TogglePill active={opts.normalizePunctuation} onClick={toggleKey('normalizePunctuation')}>Punctuation</TogglePill>
          <div className="inline-flex rounded-md border border-input overflow-hidden">
            <Button size="xs" variant={!opts.removeAIMarkers.conservative && !opts.removeAIMarkers.aggressive ? 'secondary' : 'outline'} className="h-6 px-2 text-foreground" onClick={() => setOpts((o) => ({ ...o, removeAIMarkers: { conservative: false, aggressive: false } }))}>AI Off</Button>
            <Button size="xs" variant={opts.removeAIMarkers.conservative && !opts.removeAIMarkers.aggressive ? 'secondary' : 'outline'} className="h-6 px-2 text-foreground" onClick={() => setOpts((o) => ({ ...o, removeAIMarkers: { conservative: true, aggressive: false } }))}>AI</Button>
            <Button size="xs" variant={opts.removeAIMarkers.conservative && opts.removeAIMarkers.aggressive ? 'secondary' : 'outline'} className="h-6 px-2 text-foreground" onClick={() => setOpts((o) => ({ ...o, removeAIMarkers: { conservative: true, aggressive: true } }))}>AI+</Button>
          </div>
          <div className="ml-auto text-[11px] text-muted-foreground">
            {result.report.changes} changes · {result.report.elapsedMs} ms
          </div>
        </div>
        {/* Rule count chips removed for simplicity */}
      </motion.div>

      {/* Vertical layout: Input on first row (smaller), Cleaned on second row (expands) */}
      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        <div className="flex flex-col">
          <Label htmlFor="raw" className="mb-1">Input (before)</Label>
          <Textarea id="raw" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste text here" className="h-28 text-[12px] font-mono" />
          {(opts.normalizeWhitespace || opts.normalizePunctuation || opts.removeAIMarkers.conservative || opts.removeAIMarkers.aggressive) && (
            <div className="mt-2 rounded-md border border-input bg-muted/30 p-2 text-[12px] font-mono leading-5 whitespace-pre-wrap break-words">
              <InputHighlights value={raw} showWS={opts.normalizeWhitespace} showPunct={opts.normalizePunctuation} aiMode={opts.removeAIMarkers.aggressive ? 'aggressive' : (opts.removeAIMarkers.conservative ? 'conservative' : 'off')} />
            </div>
          )}
        </div>
        <div className="flex flex-col min-h-0 flex-1">
          <Label htmlFor="cleaned-output" className="mb-1">Cleaned (after)</Label>
          <Textarea id="cleaned-output" value={result.text} readOnly className="h-full min-h-[200px] text-[12px] font-mono" />
        </div>
        {/* Advanced UI removed for simplicity */}
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

// Annotated preview for the input (before):
const InputHighlights: React.FC<{ value: string; showWS: boolean; showPunct: boolean; aiMode: 'off' | 'conservative' | 'aggressive' }>
  = ({ value, showWS, showPunct, aiMode }) => {
  const lines = React.useMemo(() => value.split('\n'), [value]);
  return (
    <span>
      {lines.map((line, li) => {
        const isAI = aiMode !== 'off' && looksLikeAIMarker(line);
        const nodes = annotateLine(line, showWS, showPunct);
        return (
          <span key={li} className={isAI ? 'bg-purple-400/10 outline outline-1 outline-purple-500/20 rounded-sm' : undefined}>
            {nodes}
            {li < lines.length - 1 ? '\n' : ''}
          </span>
        );
      })}
    </span>
  );
};

function annotateLine(line: string, showWS: boolean, showPunct: boolean): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const cp = ch.codePointAt(0) ?? 0;
    // Whitespace/invisible
    if (showWS && (isUnicodeSpaceOrInvisible(cp) || ch === '\t')) {
      const title = codepointTitle(ch);
      const hex = cp.toString(16).toUpperCase().padStart(4, '0');
      out.push(
        <span key={`ws-${i}`} className="mx-0.5 inline-flex items-center rounded-sm px-1 border border-input bg-rose-100/60 text-rose-900" title={title}>{`U+${hex}`}</span>
      );
      continue;
    }
    // Punctuation normalization targets
    if (showPunct && /[“”«»„‘’‚—–‑−…•‣▪✔✗]/.test(ch)) {
      out.push(
        <span key={`p-${i}`} className="bg-amber-300/30 outline outline-1 outline-amber-400/40 rounded-sm">{ch}</span>
      );
      continue;
    }
    out.push(<span key={`t-${i}`}>{ch}</span>);
  }
  return out;
}

// Token-level diff view: highlights inserted/changed tokens and shows deletions inline.
const DiffView: React.FC<{ original: string; cleaned: string; showInvisibles?: boolean; showRemoved?: boolean }> = ({ original, cleaned, showInvisibles, showRemoved }) => {
  const a = React.useMemo(() => splitTokensAll(original), [original]);
  const b = React.useMemo(() => splitTokensAll(cleaned), [cleaned]);
  const dp = React.useMemo(() => lcsTable(a.map(t => t.text), b.map(t => t.text)), [a, b]);

  const nodes = React.useMemo(() => {
    const out: React.ReactNode[] = [];
    let i = 0, j = 0;
    const pendingDeletes: string[] = [];
    const flushDeletes = () => {
      if (!showRemoved || pendingDeletes.length === 0) return;
      const text = pendingDeletes.join('');
      out.push(
        <span key={`del-${i}-${j}`} className={
          looksLikeAIMarker(text)
            ? 'mx-0.5 align-baseline text-purple-800 bg-purple-400/15 border border-purple-500/25 line-through rounded-sm px-1'
            : 'mx-0.5 align-baseline text-rose-800 bg-rose-400/15 border border-rose-500/25 line-through rounded-sm px-1'
        } title={text.length > 40 ? text : undefined}>
          {renderDeletedPreview(text, showInvisibles)}
        </span>
      );
      pendingDeletes.length = 0;
    };

    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i].text === b[j].text) {
        flushDeletes();
        const eqTok = a[i];
        const eqContent = eqTok.ws ? (showInvisibles ? renderInvisibles(eqTok.text) : eqTok.text) : eqTok.text;
        out.push(<span key={`eq-${i}-${j}`}>{eqContent}</span>);
        i++; j++;
      } else if (i < a.length && (j === b.length || dp[i + 1][j] >= dp[i][j + 1])) {
        // deletion from original
        pendingDeletes.push(a[i].text);
        i++;
      } else if (j < b.length) {
        // insertion in cleaned
        const t = b[j];
        const content = t.ws ? (showInvisibles ? renderInvisiblesShowSpaceDot(t.text) : t.text) : t.text;
        const title = t.ws ? codepointTitle(t.text) : undefined;
        out.push(
          <span key={`ins-${i}-${j}`} className="bg-amber-400/25 outline outline-1 outline-amber-500/30 rounded-sm" title={title}>
            {content}
          </span>
        );
        j++;
      }
    }
    flushDeletes();
    return out;
  }, [a, b, dp, showInvisibles, showRemoved]);

  return <span>{nodes}</span>;
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

function renderInvisibles(ws: string): React.ReactNode {
  const frag: React.ReactNode[] = [];
  for (let i = 0; i < ws.length; i++) {
    const ch = ws[i];
    if (ch === ' ') { frag.push(<span key={i}>{' '}</span>); continue; }
    if (ch === '\n') { frag.push(<span key={i}>⏎{"\n"}</span>); continue; }
    const cp = ch.codePointAt(0) ?? 0;
    const hex = cp.toString(16).toUpperCase().padStart(4, '0');
    frag.push(
      <span key={i} className="mx-0.5 inline-flex items-center rounded-sm px-1 border border-input bg-muted/50 text-[10px] text-foreground/80">{`U+${hex}`}</span>
    );
  }
  return <>{frag}</>;
}

// Same as renderInvisibles but shows a dot for normal space to make insertions visible
function renderInvisiblesShowSpaceDot(ws: string): React.ReactNode {
  const frag: React.ReactNode[] = [];
  for (let i = 0; i < ws.length; i++) {
    const ch = ws[i];
    if (ch === ' ') { frag.push(<span key={i}>·</span>); continue; }
    if (ch === '\n') { frag.push(<span key={i}>⏎{"\n"}</span>); continue; }
    const cp = ch.codePointAt(0) ?? 0;
    const hex = cp.toString(16).toUpperCase().padStart(4, '0');
    frag.push(
      <span key={i} className="mx-0.5 inline-flex items-center rounded-sm px-1 border border-input bg-muted/50 text-[10px] text-foreground/80">{`U+${hex}`}</span>
    );
  }
  return <>{frag}</>;
}

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-input bg-muted/40 text-foreground/80">{label}</span>
);

// Helpers for token-level LCS rendering
function splitTokensAll(s: string): Token[] {
  // Fine-grained tokenization: emit each whitespace/invisible char as a separate token
  // and group contiguous non-whitespace as one token. This makes space changes visible.
  const out: Token[] = [];
  if (!s) return out;
  let buf = '';
  const flushBuf = () => { if (buf) { out.push({ text: buf, ws: false }); buf = ''; } };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = ch.codePointAt(0) || 0;
    const isWs = /\s/.test(ch) || isUnicodeSpaceOrInvisible(code);
    if (isWs) {
      flushBuf();
      out.push({ text: ch, ws: true });
    } else {
      buf += ch;
    }
  }
  flushBuf();
  return out;
}

function isUnicodeSpaceOrInvisible(cp: number): boolean {
  // Unicode spaces and invisibles beyond JS \s
  if (cp === 0x00A0 || cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200A) || cp === 0x202F || cp === 0x205F || cp === 0x3000) return true;
  // common invisibles/format chars
  if (cp === 0x200B || cp === 0x200C || cp === 0x200D || cp === 0x2060 || cp === 0x00AD) return true; // ZWSP/ZWNJ/ZWJ/WJ/SHY
  if ((cp >= 0x200E && cp <= 0x200F) || (cp >= 0x202A && cp <= 0x202E) || (cp >= 0x2066 && cp <= 0x2069)) return true; // bidi
  return false;
}

function codepointTitle(s: string): string | undefined {
  if (!s || s.length === 0) return undefined;
  const cp = s.codePointAt(0) ?? 0;
  const hex = cp.toString(16).toUpperCase().padStart(4, '0');
  switch (cp) {
    case 0x0020: return 'U+0020 SPACE';
    case 0x00A0: return 'U+00A0 NO-BREAK SPACE';
    case 0x2009: return 'U+2009 THIN SPACE';
    case 0x202F: return 'U+202F NARROW NO-BREAK SPACE';
    case 0x200B: return 'U+200B ZERO WIDTH SPACE';
    case 0x200C: return 'U+200C ZERO WIDTH NON-JOINER';
    case 0x200D: return 'U+200D ZERO WIDTH JOINER';
    case 0x2060: return 'U+2060 WORD JOINER';
    case 0x00AD: return 'U+00AD SOFT HYPHEN';
    default: return `U+${hex}`;
  }
}

function lcsTable(a: string[], b: string[]): number[][] {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

function renderDeletedPreview(text: string, showInvisibles?: boolean): React.ReactNode {
  const trimmed = text.length > 40 ? text.slice(0, 37) + '…' : text;
  return showInvisibles ? renderInvisibles(trimmed) : trimmed;
}

function looksLikeAIMarker(s: string): boolean {
  const str = s.toLowerCase();
  if (/\bas an\s+ai\b/.test(str)) return true;
  if (/\blanguage\s+model\b/.test(str)) return true;
  if (/\bi\s+(cannot|can't)\s+(assist|provide)\b/.test(str)) return true;
  if (/\bi\s+don['’]t\s+have\s+access\s+to\b/.test(str)) return true;
  if (/\btraining\s+data\s+only\s+goes\s+up\s+to\b/.test(str)) return true;
  if (/\bi\s+hope\s+this\s+helps!?\b/.test(str)) return true;
  if (/^(pros:|cons:|conclusion:|limitations:)/i.test(s)) return true;
  if (/^(certainly|absolutely|of\s+course)[!,.]*\s+/i.test(s)) return true;
  return false;
}
