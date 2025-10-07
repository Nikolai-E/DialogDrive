import { motion } from 'framer-motion';
import { ClipboardCopy, Eraser, HelpCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { usePrefsStore } from '../../../lib/prefsStore';
import {
  cleanText,
  type BlockCodeMode,
  type CleanOptions,
  type InlineCodeMode,
  type LinkMode,
  type ListMode,
} from '../../../lib/textCleaner';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

export const TextCleanerPanel: React.FC = () => {
  const [raw, setRaw] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const cleanerOptions = usePrefsStore((state) => state.cleanerOptions);
  const setCleanerOptions = usePrefsStore((state) => state.setCleanerOptions);
  const cleanerTipsVisible = usePrefsStore((state) => state.cleanerTipsVisible);
  const setCleanerTipsVisible = usePrefsStore((state) => state.setCleanerTipsVisible);
  const prefsHydrated = usePrefsStore((state) => state._rehydrated);

  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const opts = useMemo(
    () => ({
      ...cleanerOptions,
      punctuation: { ...cleanerOptions.punctuation },
      structure: { ...cleanerOptions.structure },
      whitespace: { ...cleanerOptions.whitespace },
    }),
    [cleanerOptions],
  );

  const result = useMemo(() => cleanText(raw, opts), [raw, opts]);

  const handleLinkModeChange = (mode: LinkMode) => {
    if (mode === opts.linkMode) return;
    setCleanerOptions({ linkMode: mode });
  };

  const handleListModeChange = (mode: ListMode) => {
    if (mode === opts.listMode) return;
    setCleanerOptions({ listMode: mode });
  };

  const handleInlineCodeChange = (mode: InlineCodeMode) => {
    if (mode === opts.inlineCode) return;
    setCleanerOptions({ inlineCode: mode });
  };

  const handleBlockCodeChange = (mode: BlockCodeMode) => {
    if (mode === opts.blockCode) return;
    setCleanerOptions({ blockCode: mode });
  };

  const updateStructure = (patch: Partial<CleanOptions['structure']>) => {
    setCleanerOptions({ structure: { ...opts.structure, ...patch } });
  };

  const updatePunctuation = (patch: Partial<CleanOptions['punctuation']>) => {
    setCleanerOptions({ punctuation: { ...opts.punctuation, ...patch } });
  };

  const updateWhitespace = (patch: Partial<CleanOptions['whitespace']>) => {
    setCleanerOptions({ whitespace: { ...opts.whitespace, ...patch } });
  };

  const removeMarkdownEnabled = !opts.structure.keepBasicMarkdown && opts.listMode === 'unwrapToSentences';
  const aiCleanupEnabled =
    opts.punctuation.mapEmDash !== 'keep' ||
    opts.punctuation.mapEnDash !== 'keep' ||
    opts.punctuation.curlyQuotes === 'straight' ||
    opts.punctuation.ellipsis !== 'keep';
  const anonymizeEnabled = opts.redactContacts;

  const handleRemoveMarkdownToggle = (checked: boolean) => {
    setCleanerOptions({
      listMode: checked ? 'unwrapToSentences' : 'keepBullets',
      structure: {
        ...opts.structure,
        dropHeadings: checked,
        dropTables: checked,
        dropFootnotes: checked,
        dropBlockquotes: checked,
        dropHorizontalRules: checked,
        keepBasicMarkdown: !checked,
      },
    });
  };

  const handleAiCleanupToggle = (checked: boolean) => {
    updatePunctuation({
      mapEmDash: checked ? 'comma' : 'keep',
      mapEnDash: checked ? 'hyphen' : 'keep',
      curlyQuotes: checked ? 'straight' : 'keep',
      ellipsis: checked ? 'dots' : 'keep',
    });
  };

  const handleAnonymizeToggle = (checked: boolean) => {
    setCleanerOptions({ redactContacts: checked });
  };

  return (
    <div className="relative flex flex-col h-full text-[12px]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="px-2 py-2 border-b bg-background/80 backdrop-blur-sm"
      >
        <DescriptionBlock
          descriptionVisible={prefsHydrated && cleanerTipsVisible}
          onToggleDescription={() => setCleanerTipsVisible(!usePrefsStore.getState().cleanerTipsVisible)}
        />

        <div className="mt-3 space-y-1.5">
          <PrimaryOption
            title="Remove Markdown"
            description="Convert headers, bullet points, and tables into plain paragraphs, perfect for reusing content in other contexts."
            checked={removeMarkdownEnabled}
            onChange={handleRemoveMarkdownToggle}
          />
          <PrimaryOption
            title="Remove AI Signs"
            description="Standardize punctuation and formatting (like quotes, dashes, and ellipses) to make text feel more natural and consistent, without changing its meaning or tone."
            checked={aiCleanupEnabled}
            onChange={handleAiCleanupToggle}
          />
          <PrimaryOption
            title="Anonymize Contacts"
            description="Automatically replace URLs and email addresses with placeholders, making it easier to share or reuse text safely."
            checked={anonymizeEnabled}
            onChange={handleAnonymizeToggle}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-end">
          <Button size="xs" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setShowAdvanced((prev) => !prev)}>
            {showAdvanced ? 'Hide advanced' : 'Show advanced'}
          </Button>
        </div>

        {showAdvanced && (
          <div className="mt-2 space-y-2 rounded-md border border-muted bg-muted/10 p-2">
            <SectionHeading label="Links & Lists" />
            <div className="space-y-1.5">
              <OptionGroup
                label="Links"
                value={opts.linkMode}
                options={[
                  { value: 'keepMarkdown', label: 'Markdown' },
                  { value: 'textWithUrl', label: 'Text + URL' },
                  { value: 'textOnly', label: 'Text only' },
                ]}
                onChange={(value) => handleLinkModeChange(value as LinkMode)}
              />
              <OptionGroup
                label="Lists"
                value={opts.listMode}
                options={[
                  { value: 'unwrapToSentences', label: 'Sentences' },
                  { value: 'keepBullets', label: 'Bullets' },
                  { value: 'keepNumbers', label: 'Numbered' },
                ]}
                onChange={(value) => handleListModeChange(value as ListMode)}
              />
              <OptionGroup
                label="Inline code"
                value={opts.inlineCode}
                options={[
                  { value: 'stripMarkers', label: 'Plain text' },
                  { value: 'keepMarkers', label: 'Keep `code`' },
                ]}
                onChange={(value) => handleInlineCodeChange(value as InlineCodeMode)}
              />
              <OptionGroup
                label="Code blocks"
                value={opts.blockCode}
                options={[
                  { value: 'drop', label: 'Drop' },
                  { value: 'indent', label: 'Keep indented' },
                ]}
                onChange={(value) => handleBlockCodeChange(value as BlockCodeMode)}
              />
            </div>

            <SectionHeading label="Structure" />
            <div className="space-y-1.5">
              <CompactOption
                title="Drop headings"
                tooltip="Remove Markdown headings or HTML titles from the cleaned output."
                checked={opts.structure.dropHeadings}
                onChange={(checked) => updateStructure({ dropHeadings: checked })}
              />
              <CompactOption
                title="Drop tables"
                tooltip="Skip table content when cleaning to keep the text linear."
                checked={opts.structure.dropTables}
                onChange={(checked) => updateStructure({ dropTables: checked })}
              />
              <CompactOption
                title="Drop footnotes"
                tooltip="Remove Markdown footnotes or references."
                checked={opts.structure.dropFootnotes}
                onChange={(checked) => updateStructure({ dropFootnotes: checked })}
              />
              <CompactOption
                title="Drop horizontal rules"
                tooltip="Remove Markdown separators like --- or *** from the cleaned text."
                checked={opts.structure.dropHorizontalRules}
                onChange={(checked) => updateStructure({ dropHorizontalRules: checked })}
              />
              <CompactOption
                title="Flatten blockquotes"
                tooltip="Unwrap quoted text so it flows like regular paragraphs."
                checked={opts.structure.dropBlockquotes}
                onChange={(checked) => updateStructure({ dropBlockquotes: checked })}
              />
              <CompactOption
                title="Keep Markdown styling"
                tooltip="Preserve basic Markdown markers like **bold** and bullet markers when possible."
                checked={opts.structure.keepBasicMarkdown}
                onChange={(checked) => updateStructure({ keepBasicMarkdown: checked })}
              />
              <CompactOption
                title="Strip emojis"
                tooltip="Remove emoji characters for cleaner, more formal output."
                checked={opts.structure.stripEmojis}
                onChange={(checked) => updateStructure({ stripEmojis: checked })}
              />
            </div>

            <SectionHeading label="Punctuation" />
            <div className="space-y-1.5">
              <OptionGroup
                label="Em dash"
                value={opts.punctuation.mapEmDash}
                options={[
                  { value: 'comma', label: '→ ,' },
                  { value: 'hyphen', label: '→ -' },
                  { value: 'keep', label: 'Keep' },
                ]}
                onChange={(value) => updatePunctuation({ mapEmDash: value as CleanOptions['punctuation']['mapEmDash'] })}
              />
              <OptionGroup
                label="Ellipsis"
                value={opts.punctuation.ellipsis}
                options={[
                  { value: 'dots', label: '...' },
                  { value: 'keep', label: 'Keep …' },
                  { value: 'remove', label: 'Remove' },
                ]}
                onChange={(value) => updatePunctuation({ ellipsis: value as CleanOptions['punctuation']['ellipsis'] })}
              />
              <CompactOption
                title="Straighten quotes"
                tooltip="Convert curly quotes to straight ASCII quotes."
                checked={opts.punctuation.curlyQuotes === 'straight'}
                onChange={(checked) => updatePunctuation({ curlyQuotes: checked ? 'straight' : 'keep' })}
              />
              <CompactOption
                title="Normalize en dashes"
                tooltip="Convert – and similar dashes to a standard hyphen."
                checked={opts.punctuation.mapEnDash === 'hyphen'}
                onChange={(checked) => updatePunctuation({ mapEnDash: checked ? 'hyphen' : 'keep' })}
              />
            </div>

            <SectionHeading label="Whitespace" />
            <div className="space-y-1.5">
              <CompactOption
                title="Normalize NBSP"
                tooltip="Convert non-breaking spaces to regular spaces except inside URLs."
                checked={opts.whitespace.normalizeNbsp}
                onChange={(checked) => updateWhitespace({ normalizeNbsp: checked })}
              />
              <CompactOption
                title="Collapse blank lines"
                tooltip="Limit consecutive blank lines to a single blank line."
                checked={opts.whitespace.collapseBlankLines}
                onChange={(checked) => updateWhitespace({ collapseBlankLines: checked })}
              />
              <CompactOption
                title="Ensure final newline"
                tooltip="Guarantee the output ends with a newline."
                checked={opts.whitespace.ensureFinalNewline}
                onChange={(checked) => updateWhitespace({ ensureFinalNewline: checked })}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Vertical layout: Input on first row (smaller), Cleaned on second row (expands) */}
      <div className="flex-1 grid grid-rows-[auto,1fr] gap-3 p-2 min-h-0">
        <div className="flex flex-col min-h-[140px] rounded-lg border-2 border-border/60 bg-background shadow-sm">
          <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
            <Label htmlFor="raw" className="text-[11px] font-semibold">Input</Label>
          </div>
          <Textarea
            id="raw"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste text here"
            className="flex-1 min-h-[120px] resize-y text-[12px] bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2"
          />
        </div>
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="clean" className="text-[11px] font-semibold">Cleaned</Label>
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
          <div className="relative flex-1 min-h-[240px] rounded-lg border-2 border-border/60 bg-background shadow-sm">
            <div className="absolute inset-0 overflow-auto rounded-lg p-3 text-[12px] whitespace-pre-wrap font-mono leading-5" aria-hidden>
              <DiffView original={raw} cleaned={result.text} />
            </div>
            {/* Transparent overlay for easy select+copy; disable pointer events so scroll hits the diff below */}
            <Textarea id="clean" value={result.text} readOnly className="absolute inset-0 rounded-lg opacity-0 pointer-events-none border-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextCleanerPanel;

const PrimaryOption: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, description, checked, onChange }) => (
  <div className="flex items-start justify-between gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
    <div className="flex-1 min-w-0">
      <label className="text-[12px] font-semibold text-foreground leading-tight cursor-pointer" onClick={() => onChange(!checked)}>
        {title}
      </label>
      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{description}</p>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      aria-label={`Toggle ${title}`}
      className="mt-1 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input border border-border"
    />
  </div>
);

const CompactOption: React.FC<{
  title: string;
  tooltip: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, tooltip, checked, onChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <label className="text-[11px] font-medium text-foreground leading-tight cursor-pointer truncate" onClick={() => onChange(!checked)}>
          {title}
        </label>
        <div className="relative flex-shrink-0">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(!showTooltip);
            }}
            aria-label="More info"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          {showTooltip && (
            <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-56 p-2 text-[10px] leading-snug bg-popover text-popover-foreground border border-border rounded-md shadow-lg">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-l border-t border-border rotate-45" />
              {tooltip}
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <Switch 
          checked={checked} 
          onCheckedChange={onChange} 
          aria-label={`Toggle ${title}`}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input border border-border"
        />
      </div>
    </div>
  );
};

const SectionHeading: React.FC<{ label: string }> = ({ label }) => (
  <div className="pt-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
    {label}
  </div>
);

const OptionGroup: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[11px] font-medium text-foreground leading-tight">{label}</span>
    <div className="inline-flex rounded-md border border-input overflow-hidden">
      {options.map((option) => (
        <Button
          key={option.value}
          size="xs"
          variant={option.value === value ? 'secondary' : 'outline'}
          className="h-6 px-3 text-[11px]"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  </div>
);

const DescriptionBlock: React.FC<{
  descriptionVisible: boolean;
  onToggleDescription: () => void;
}> = ({ descriptionVisible, onToggleDescription }) => (
  <div className="space-y-1.5 text-[11px] text-muted-foreground">
    {descriptionVisible && (
      <div className="rounded-md border border-dashed border-muted bg-muted/20 p-2.5 leading-snug">
        <div className="flex items-center justify-between gap-2 text-foreground mb-1.5">
          <p className="font-semibold text-[12px]">Why clean text?</p>
          <button className="text-[10px] underline underline-offset-2 hover:text-foreground/80" onClick={onToggleDescription}>
            Hide
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] leading-relaxed">
            <strong className="text-foreground">Paste-ready:</strong> Quickly tidy up messy or inconsistent text, from chat logs, markdown, or tool output, so it’s ready to reuse anywhere.
          </p>
          <p className="text-[11px] leading-relaxed">
            <strong className="text-foreground">Consistent style:</strong> Normalize punctuation and formatting for a smoother, more polished reading experience.
          </p>
          <p className="text-[11px] leading-relaxed">
            <strong className="text-foreground">Faster workflow:</strong> Turn raw text into something you can immediately drop into an email, document, or message, no manual cleanup needed.
          </p>
        </div>
      </div>
    )}
    {!descriptionVisible && (
      <button className="text-[11px] font-medium text-foreground underline underline-offset-2 hover:text-foreground/80" onClick={onToggleDescription}>
        Why clean text?
      </button>
    )}
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
          <span
            key={i}
            className="bg-amber-300/45 text-foreground px-0.5 rounded-[3px] shadow-[0_0_0_1px_rgba(217,119,6,0.35)]"
          >
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
