import { motion } from 'framer-motion';
import { ClipboardCopy, Eraser } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { secureStorage } from '../../../lib/secureStorageV2';
import { cleanText, defaultCleanOptions, type CleanOptions } from '../../../lib/textCleaner';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

export const TextCleanerPanel: React.FC = () => {
  const [raw, setRaw] = useState('');
  const [opts, setOpts] = useState<CleanOptions>({
    ...defaultCleanOptions,
    symbolMap: { ...defaultCleanOptions.symbolMap },
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState(true);

  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const result = useMemo(() => cleanText(raw, opts), [raw, opts]);

  // Load saved cleaner options on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const prefs = (await secureStorage.getPreferences<any>()) || {};
        const saved = prefs?.cleanerOptions;
        if (!alive || !saved) return;
        const migrated = migrateLegacyOptions(saved);
        if (!migrated) return;
        setOpts((current) => ({ ...current, ...migrated }));
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist cleaner options when they change (lightweight object)
  useEffect(() => {
    const toSave = {
      tidyStructure: opts.tidyStructure,
      tone: opts.tone,
      preserveCodeBlocks: opts.preserveCodeBlocks,
      stripSymbols: opts.stripSymbols,
      redactContacts: opts.redactContacts,
      transliterateLatin: opts.transliterateLatin,
      ellipsisMode: opts.ellipsisMode,
      symbolMap: opts.symbolMap,
      aiPhraseBlacklist: opts.aiPhraseBlacklist,
    } satisfies Partial<CleanOptions>;

    (async () => {
      try {
        const prefs = (await secureStorage.getPreferences<any>()) || {};
        await secureStorage.setPreferences({ ...prefs, cleanerOptions: toSave });
      } catch {
        // ignore
      }
    })();
  }, [
    opts.tidyStructure,
    opts.tone,
    opts.preserveCodeBlocks,
    opts.stripSymbols,
    opts.redactContacts,
    opts.transliterateLatin,
    opts.ellipsisMode,
    opts.symbolMap,
    opts.aiPhraseBlacklist,
  ]);

  return (
    <div className="relative flex flex-col h-full text-[12px]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="px-2 py-2 border-b bg-background/80"
      >
        <DescriptionBlock
          onToggle={() => setShowAdvanced((prev) => !prev)}
          label={showAdvanced ? 'Hide advanced' : 'Advanced options'}
          descriptionVisible={descriptionVisible}
          onToggleDescription={() => setDescriptionVisible((prev) => !prev)}
        />

        {showAdvanced && (
          <div className="mt-2 space-y-2 rounded-md border border-muted bg-muted/10 p-2">
            <AdvancedRow
              title="Structure tidy"
              description="Softens markdown scaffolding (bullets, step labels, headings) without changing your paragraphs."
              control={<Switch checked={opts.tidyStructure} onCheckedChange={(checked) => setOpts((prev) => ({ ...prev, tidyStructure: checked }))} aria-label="Toggle structure tidy" />}
            />
            <AdvancedRow
              title="Tone scrub"
              description="Removes AI-sounding intros/outros and filler. Gentle keeps more nuance; Assertive is stricter."
              control={(
                <Select value={opts.tone} onValueChange={(value) => setOpts((prev) => ({ ...prev, tone: value as CleanOptions['tone'] }))}>
                  <SelectTrigger className="h-7 w-[116px] px-2 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-[11px]">
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="gentle">Gentle</SelectItem>
                    <SelectItem value="assertive">Assertive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <AdvancedRow
              title="Preserve code"
              description="Skip edits inside fenced code blocks and inline `code`."
              control={<Switch checked={opts.preserveCodeBlocks} onCheckedChange={(checked) => setOpts((prev) => ({ ...prev, preserveCodeBlocks: checked }))} aria-label="Toggle preserve code" />}
            />
            <AdvancedRow
              title="Strip symbols"
              description="Remove emojis and non-keyboard symbols unless overridden by a custom map."
              control={<Switch checked={opts.stripSymbols} onCheckedChange={(checked) => setOpts((prev) => ({ ...prev, stripSymbols: checked }))} aria-label="Toggle strip symbols" />}
            />
            <AdvancedRow
              title="Redact contacts"
              description="Replace URLs and email addresses with <URL> / <EMAIL>."
              control={<Switch checked={opts.redactContacts} onCheckedChange={(checked) => setOpts((prev) => ({ ...prev, redactContacts: checked }))} aria-label="Toggle redact contacts" />}
            />
            <AdvancedRow
              title="Strip accents"
              description="Remove combining accents in Latin text (résumé → resume)."
              control={<Switch checked={opts.transliterateLatin} onCheckedChange={(checked) => setOpts((prev) => ({ ...prev, transliterateLatin: checked }))} aria-label="Toggle strip accents" />}
            />
            <AdvancedRow
              title="Ellipsis style"
              description="Choose how … characters render in the cleaned output."
              control={(
                <div className="inline-flex rounded-md border border-input">
                  <Button size="xs" variant={opts.ellipsisMode === 'dots' ? 'secondary' : 'outline'} className="h-7 px-3" onClick={() => setOpts((prev) => ({ ...prev, ellipsisMode: 'dots' }))}>...</Button>
                  <Button size="xs" variant={opts.ellipsisMode === 'dot' ? 'secondary' : 'outline'} className="h-7 px-3" onClick={() => setOpts((prev) => ({ ...prev, ellipsisMode: 'dot' }))}>.</Button>
                </div>
              )}
            />
          </div>
        )}
      </motion.div>

      {/* Vertical layout: Input on first row (smaller), Cleaned on second row (expands) */}
      <div className="flex-1 grid grid-rows-[auto,1fr] gap-2 p-2 min-h-0">
        <div className="flex flex-col min-h-[140px]">
          <Label htmlFor="raw" className="mb-1">Input</Label>
          <Textarea
            id="raw"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste text here"
            className="flex-1 min-h-[120px] resize-y text-[12px]"
          />
        </div>
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="clean">Cleaned</Label>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground">{result.report.changes} adjustments</span>
              <Button size="xs" variant="outline" withIcon onClick={() => setRaw('')}>
                <Eraser className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button size="xs" withIcon className="bg-foreground text-white hover:opacity-90" onClick={() => copyToClipboard(result.text)} disabled={!result.text}>
                <ClipboardCopy className="h-3.5 w-3.5" /> {isCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          {/* Diff-highlighted view layered under a transparent textarea for easy copying and selection */}
          <div className="relative flex-1 min-h-[240px]">
            <div className="absolute inset-0 overflow-auto rounded-md border border-input bg-muted/30 p-2 text-[12px] whitespace-pre-wrap font-mono leading-5" aria-hidden>
              <DiffView original={raw} cleaned={result.text} />
            </div>
            {/* Transparent overlay for easy select+copy; disable pointer events so scroll hits the diff below */}
            <Textarea id="clean" value={result.text} readOnly className="absolute inset-0 opacity-0 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextCleanerPanel;

function migrateLegacyOptions(saved: any): Partial<CleanOptions> | null {
  if (!saved || typeof saved !== 'object') return null;

  if ('standardize' in saved || 'tone' in saved) {
    const next = { ...saved } as Partial<CleanOptions>;
    if (typeof next.tone === 'string' && !['off', 'gentle', 'assertive'].includes(next.tone)) {
      delete next.tone;
    }
    return next;
  }

  const migrated: Partial<CleanOptions> = {};

  if (typeof saved?.flattenMarkdown === 'boolean') migrated.tidyStructure = saved.flattenMarkdown;

  const legacyTone = saved?.removeAIMarkers;
  if (legacyTone && typeof legacyTone === 'object') {
    migrated.tone = legacyTone.aggressive ? 'assertive' : legacyTone.conservative ? 'gentle' : 'off';
  }

  if (typeof saved?.preserveCodeBlocks === 'boolean') migrated.preserveCodeBlocks = saved.preserveCodeBlocks;
  if (typeof saved?.stripNonKeyboardSymbols === 'boolean') migrated.stripSymbols = saved.stripNonKeyboardSymbols;
  if (typeof saved?.redactURLs === 'boolean') migrated.redactContacts = saved.redactURLs;
  if (typeof saved?.transliterateDiacritics === 'boolean') migrated.transliterateLatin = saved.transliterateDiacritics;
  if (typeof saved?.ellipsisMode === 'string') migrated.ellipsisMode = saved.ellipsisMode;
  if (Array.isArray(saved?.aiPhraseBlacklist)) migrated.aiPhraseBlacklist = [...saved.aiPhraseBlacklist];
  if (saved?.symbolMap && typeof saved.symbolMap === 'object') migrated.symbolMap = { ...saved.symbolMap };

  return Object.keys(migrated).length ? migrated : null;
}

const AdvancedRow: React.FC<{ title: string; description: string; control: React.ReactNode }> = ({ title, description, control }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-foreground">{title}</p>
      <p className="max-w-[360px] text-[10px] leading-snug text-muted-foreground">{description}</p>
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

const DescriptionBlock: React.FC<{
  onToggle: () => void;
  label: string;
  descriptionVisible: boolean;
  onToggleDescription: () => void;
}> = ({ onToggle, label, descriptionVisible, onToggleDescription }) => (
  <div className="space-y-1 text-[11px] text-muted-foreground">
    {descriptionVisible && (
      <div className="rounded-md border border-dashed border-muted bg-muted/20 p-2 leading-snug">
        <div className="flex items-center justify-between gap-2 text-foreground">
          <p className="font-medium">What this cleaner does</p>
          <button className="text-[10px] underline underline-offset-2" onClick={onToggleDescription}>
            Hide
          </button>
        </div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Converts smart quotes to straight quotes and normalizes punctuation.</li>
          <li>Removes hidden Unicode, non-breaking spaces, and stray control characters.</li>
          <li>Turns em/en dashes into commas for natural sentence flow.</li>
          <li>Collapses double spaces while preserving paragraph breaks.</li>
          <li>Keeps standard ASCII, emojis, and readable formatting intact.</li>
        </ul>
      </div>
    )}
    {!descriptionVisible && (
      <button className="text-[10px] font-medium text-foreground underline underline-offset-2" onClick={onToggleDescription}>
        Show what this cleaner does
      </button>
    )}
    <div className="flex items-center justify-between">
      <span>{/* spacer for alignment */}</span>
      <Button size="xs" variant="ghost" className="h-6 px-2" onClick={onToggle}>
        {label}
      </Button>
    </div>
  </div>
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
