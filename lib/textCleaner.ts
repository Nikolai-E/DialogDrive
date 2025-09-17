/**
 * TextCleaner — deterministic, zero‑dependency text sanitizer for TS/JS.
 *
 * Implements a contract, ordered pipeline, rules, heuristics, reporting, and safety levers
 * suitable for a Chrome extension (WXT + React), and equally usable in Node.
 *
 * Export:
 *  - cleanText(input: string, userOptions?: Partial<CleanOptions>): CleanResult
 *  - defaultCleanOptions: CleanOptions
 *  - types: CleanOptions, CleanReport, CleanResult, RuleId
 *
 * Key design notes:
 *  • Deterministic, ordered stages. Each stage operates on non‑code segments when preserveCodeBlocks=true.
 *  • Zero throws. Invalid options fall back to defaults.
 *  • Regexes precompiled once. Linear-time passes. No backtracking-heavy patterns.
 *  • Reporting: per‑rule counts + total changes + elapsedMs.
 *  • Conservative AI-marker filters off by default; aggressive available.
 *  • Locale-sensitive toggles (ellipsis mapping), symbol mapping table, URL/email redaction.
 */

export type RuleId =
  | 'normalize:line-endings'
  | 'normalize:unicode-nfkc'
  | 'strip:bom'
  | 'strip:control'
  | 'strip:invisible'
  | 'map:nbsp-to-space'
  | 'ws:collapse-inline'
  | 'ws:trim-lines'
  | 'ws:collapse-blank-lines'
  | 'punct:quotes'
  | 'punct:dashes'
  | 'punct:ellipsis'
  | 'punct:bullets'
  | 'punct:fractions'
  | 'punct:fullwidth-ascii'
  | 'symbols:strip-nonkeyboard'
  | 'md:flatten-headings'
  | 'md:flatten-emphasis'
  | 'md:flatten-lists'
  | 'md:flatten-links'
  | 'md:flatten-images'
  | 'md:strip-inline-code'
  | 'redact:url'
  | 'redact:email'
  | 'transliterate:strip-combining'
  | 'ai:conservative'
  | 'ai:aggressive'
  | 'ws:final-pass';

export interface CleanOptions {
  normalizeUnicode: boolean; // NFKC + BOM strip
  stripInvisible: boolean; // remove ZW*, bidi marks, SHY etc
  normalizeWhitespace: boolean; // collapse spaces, tidy newlines
  normalizePunctuation: boolean; // curly quotes → straight, dashes, ellipsis, bullets, fractions, full-width
  stripNonKeyboardSymbols: boolean; // remove/map emojis/arrows/math
  transliterateDiacritics: boolean; // remove \p{M} on Latin-dominant text
  flattenMarkdown: boolean; // remove MD formatting (outside code)
  preserveCodeBlocks: boolean; // skip inside ```fences``` and `inline`
  redactURLs: boolean; // replace URLs/emails with placeholders
  removeAIMarkers: { conservative: boolean; aggressive: boolean };
  ellipsisMode: 'dots' | 'dot'; // … → '...' | '.'
  symbolMap: Record<string, string>; // custom mapping for non-keyboard symbols
  aiPhraseBlacklist: (string | RegExp)[]; // extra phrases
  debug: boolean; // include simple diff snippets
}

export interface CleanReport {
  ruleCounts: Record<RuleId, number>;
  changes: number;
  elapsedMs?: number;
  debug?: { rule: RuleId; before: string; after: string }[];
}

export interface CleanResult {
  text: string;
  report: CleanReport;
}

export const defaultCleanOptions: CleanOptions = {
  normalizeUnicode: true,
  stripInvisible: true,
  normalizeWhitespace: true,
  normalizePunctuation: true,
  stripNonKeyboardSymbols: false,
  transliterateDiacritics: false,
  flattenMarkdown: false,
  preserveCodeBlocks: true,
  redactURLs: false,
  removeAIMarkers: { conservative: false, aggressive: false },
  ellipsisMode: 'dots',
  symbolMap: {},
  aiPhraseBlacklist: [],
  debug: false,
};

// =========================
// Internal helpers & regexes
// =========================

type SegmentType = 'text' | 'codeblock' | 'inline';
interface Segment { type: SegmentType; text: string; }

const RE = {
  crlf: /\r\n?/g,
  bomStart: /^\uFEFF/,
  // Controls: C0/C1 except TAB(\u0009) and LF(\u000A)
  control: /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
  // Invisibles & format characters
  // ZWSP 200B, ZWNJ 200C, ZWJ 200D, WJ 2060, SHY 00AD, NBSP 00A0, NNBSP 202F, FEFF handled by BOM
  invisibles: /[\u200B-\u200D\u2060\u00AD\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
  nbsp: /\u00A0/g,
  nnBsp: /\u202F/g,
  // Whitespace collapse (horizontal)
  horizWS: /[ \t]+/g,
  trailWS: /[ \t]+\n/g,
  blankLines: /\n{3,}/g,
  // Punctuation maps
  curlyDblQuotes: /[“”«»„]/g,
  curlySglQuotes: /[‘’‚]/g,
  dashes: /[—–‑−]/g, // em, en, non-breaking hyphen, minus sign
  emDash: /—/g,
  emDashSpaced: /\s*—\s*/g,
  otherDashes: /[–‑−]/g, // en, non-breaking hyphen, minus sign
  ellipsis: /…/g,
  bullets: /[•·‣▪✔✗]/g,
  // Fractions & superscripts subset
  fractions: /[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g,
  superscripts: /[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,
  // Full-width ASCII block
  fullWidth: /[！-～]/g, // U+FF01 - U+FF5E
  // URLs & emails (simple but effective)
  url: /\b((?:https?:\/\/|www\.)[^\s<)]+)\b/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // Emoji & symbols (approximate common planes)
  emoji: /[\u2600-\u27BF\uFE0F\u{1F1E6}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
  // Markdown structures
  mdFence: /```[\s\S]*?```|~~~[\s\S]*?~~~/g,
  mdInlineCode: /`[^`\n]+`/g,
  mdHeading: /^(\s{0,3})#{1,6}\s+/gm,
  mdEmphasis: /([*_~]{1,3})([^*_~\n][^\n]*?)(\1)/g,
  mdListMarker: /^(\s*)(?:[-*+]|\d{1,3}[\.)])\s+/gm,
  mdImage: /!\[([^\]]*)\]\(([^)]+)\)/g,
  mdLink: /\[([^\]]+)\]\(([^)]+)\)/g,
  // Latin script and combining marks
  letter: /\p{L}/gu,
  latin: /\p{Script=Latin}/gu,
  combining: /\p{M}+/gu,
};

const FRACTION_MAP: Record<string, string> = {
  '¼': '1/4', '½': '1/2', '¾': '3/4', '⅐': '1/7', '⅑': '1/9', '⅒': '1/10',
  '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};

// AI marker patterns (boundary-aware, case-insensitive)
const AI_CONSERVATIVE: RegExp[] = [
  /\b(as an\s+ai(?:\s+language\s+model)?)\b/i,
  /\b(i\s+(?:cannot|can't)\s+assist\s+with)\b/i,
  /\b(i\s+don['’]t\s+have\s+access\s+to\s+(?:real[- ]?time\s+data|the\s+internet))\b/i,
  /\b(here(?:'|’)s\s+(?:a|the)\s+step[- ]?by[- ]?step)\b/i,
  /\b(key\s+takeaways:)\b/i,
  /\b(remember\s+that)\b.*$/im,
  /\b(i\s+hope\s+this\s+helps!?)\b/i,
  /^(pros:|cons:|conclusion:|limitations:)/im,
];

const AI_AGGRESSIVE: RegExp[] = [
  /^(certainly|absolutely|of\s+course)[!,.]*\s+/im, // drop lead-in token
  /^(additionally|furthermore|in\s+conclusion),\s+/gim, // drop discourse markers at line start
  /\n(?:\s*(?:pros|cons|key\s+takeaways)\s*:\s*\n){1,}/gi, // strip templated sections
];

// =========================
// Public API
// =========================

export function cleanText(input: string, userOptions: Partial<CleanOptions> = {}): CleanResult {
  const start = performanceNow();
  const opt = withDefaults(userOptions);
  const report: CleanReport = { ruleCounts: initRuleCounts(), changes: 0 };
  const debug: { rule: RuleId; before: string; after: string }[] = [];

  // 1) Normalize line endings globally (safe even with code)
  let text = applyRule('normalize:line-endings', input.replace(RE.crlf, '\n'), input, report, debug, opt);

  // 2) Segment to protect code if requested
  const segments = opt.preserveCodeBlocks ? segmentMarkdown(text) : [{ type: 'text' as SegmentType, text }];

  // 3) Process non-code segments stage-by-stage
  const processed: string[] = [];
  for (const seg of segments) {
    if (seg.type !== 'text') { processed.push(seg.text); continue; }
    let t = seg.text;

    // 2) Unicode normalization + BOM strip
    if (opt.normalizeUnicode) {
      const before = t;
      // NFKC collapses compatibility characters (full-width ASCII, etc.)
      t = t.normalize('NFKC');
      t = t.replace(RE.bomStart, '');
      report.ruleCounts['normalize:unicode-nfkc'] += diffCount(before, t);
      report.ruleCounts['strip:bom'] += before.length !== t.length ? 1 : 0;
    }

    // 3) Strip control + invisibles
    if (opt.stripInvisible) {
      const before = t;
      t = t.replace(RE.control, '');
      const afterControl = t;
      t = t.replace(RE.invisibles, '');
      report.ruleCounts['strip:control'] += diffCount(before, afterControl);
      report.ruleCounts['strip:invisible'] += diffCount(afterControl, t);

      if (opt.normalizeWhitespace) {
        // NBSP/NNBSP → space so it can be collapsed later
        const before2 = t;
        t = t.replace(RE.nbsp, ' ').replace(RE.nnBsp, ' ');
        report.ruleCounts['map:nbsp-to-space'] += diffCount(before2, t);
      }
    }

    // 4) Whitespace normalization (outside code)
    if (opt.normalizeWhitespace) {
      const before = t;
      t = t.replace(RE.trailWS, '\n'); // strip trailing spaces
      t = t.replace(RE.horizWS, ' ');
      t = collapseBlankLines(t);
      report.ruleCounts['ws:collapse-inline'] += diffCount(before, t);
      // Count blank-line collapse separately (best-effort):
      const blanksBefore = (before.match(RE.blankLines) || []).length;
      const blanksAfter = (t.match(RE.blankLines) || []).length;
      if (blanksBefore > blanksAfter) report.ruleCounts['ws:collapse-blank-lines'] += (blanksBefore - blanksAfter);
    }

    // 5) Punctuation normalization
  if (opt.normalizePunctuation) {
  t = mapReplace(t, RE.curlyDblQuotes, '"', 'punct:quotes', report);
  t = mapReplace(t, RE.curlySglQuotes, "'", 'punct:quotes', report);
    // Map em dash (consuming surrounding spaces) to a comma followed by a space,
    // so "word — next" → "word, next" and "word—next" → "word, next".
  t = t.replace(RE.emDashSpaced, () => (incr('punct:dashes', report), ', '));
    // Keep other dash-like characters as a simple hyphen
  t = mapReplace(t, RE.otherDashes, '-', 'punct:dashes', report);
  t = mapReplace(t, RE.ellipsis, opt.ellipsisMode === 'dot' ? '.' : '...', 'punct:ellipsis', report);
  t = mapReplace(t, RE.bullets, '-', 'punct:bullets', report);
  t = t.replace(RE.fractions, (m: string) => (incr('punct:fractions', report), FRACTION_MAP[m] || m));
  t = t.replace(RE.superscripts, (m: string) => (incr('punct:fractions', report), SUPERSCRIPT_MAP[m] || m));
      // Full-width ASCII to half-width by codepoint math
  t = t.replace(RE.fullWidth, (ch: string) => {
        const hw = String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
        incr('punct:fullwidth-ascii', report);
        return hw;
      });
    }

    // 6) Symbol and emoji handling
    if (opt.stripNonKeyboardSymbols) {
      const before = t;
      // First map any custom symbols
      if (opt.symbolMap && Object.keys(opt.symbolMap).length) {
        for (const [k, v] of Object.entries(opt.symbolMap)) {
          const re = new RegExp(escapeRegex(k), 'g');
          t = t.replace(re, v);
        }
      }
      // Remove common emoji/symbol ranges
      t = t.replace(RE.emoji, (m: string) => {
        // if mapping specified for this emoji, use it; otherwise drop
        const mapped = opt.symbolMap[m as string];
        return (incr('symbols:strip-nonkeyboard', report), mapped ?? '');
      });
      if (before !== t && opt.debug) debug.push({ rule: 'symbols:strip-nonkeyboard', before, after: t });
    }

    // 7) Markdown flattening
    if (opt.flattenMarkdown) {
      t = t.replace(RE.mdHeading, '$1');
      count('md:flatten-headings', t, report);

      // emphasis: *text*, _text_, ~~text~~ → text
      const before = t;
      t = t.replace(RE.mdEmphasis, '$2');
      if (before !== t) report.ruleCounts['md:flatten-emphasis'] += 1;

      // lists → replace marker with "- "
  t = t.replace(RE.mdListMarker, (_m: string, p1: string) => (incr('md:flatten-lists', report), `${p1}- `));

      // images: keep alt text
  t = t.replace(RE.mdImage, (_m: string, alt: string) => (incr('md:flatten-images', report), alt || ''));

      // links: keep link text
  t = t.replace(RE.mdLink, (_m: string, txt: string) => (incr('md:flatten-links', report), txt));

      // inline code: remove backticks (but only when not preserving)
      if (!opt.preserveCodeBlocks) {
        const b2 = t;
  t = t.replace(RE.mdInlineCode, (m: string) => (incr('md:strip-inline-code', report), m.slice(1, -1)));
        if (b2 !== t && opt.debug) debug.push({ rule: 'md:strip-inline-code', before: b2, after: t });
      }
    }

    // 8) URL/email redaction
    if (opt.redactURLs) {
      const before = t;
  t = t.replace(RE.url, (_m: string) => (incr('redact:url', report), '<URL>'));
  t = t.replace(RE.email, (_m: string) => (incr('redact:email', report), '<EMAIL>'));
      if (before !== t && opt.debug) debug.push({ rule: 'redact:url', before, after: t });
    }

    // 9) Transliteration (strip combining marks) for Latin-dominant text
    if (opt.transliterateDiacritics) {
      if (isLatinDominant(t)) {
        const before = t;
        t = t.normalize('NFD').replace(RE.combining, '').normalize('NFC');
        if (before !== t) report.ruleCounts['transliterate:strip-combining'] += 1;
      }
    }

    // 10) AI-marker heuristics (toggleable)
    if (opt.removeAIMarkers.conservative || opt.removeAIMarkers.aggressive || opt.aiPhraseBlacklist.length) {
      const before = t;
      t = applyAIMarkers(t, opt, report);
      if (before !== t && opt.debug) debug.push({ rule: opt.removeAIMarkers.aggressive ? 'ai:aggressive' : 'ai:conservative', before, after: t });
    }

    // 11) Final whitespace pass
    if (opt.normalizeWhitespace) {
      const before = t;
      t = t.replace(RE.trailWS, '\n').replace(RE.horizWS, ' ');
      t = collapseBlankLines(t).trim();
      report.ruleCounts['ws:final-pass'] += diffCount(before, t);
    }

    processed.push(t);
  }

  // Reassemble
  text = processed.join('');

  const elapsedMs = performanceNow() - start;
  // Sum all counts to changes (approximate — not 1:1 with character delta)
  const changes = Object.values(report.ruleCounts).reduce((a, b) => a + b, 0);
  report.changes = changes;
  report.elapsedMs = Math.round(elapsedMs);
  if (opt.debug) report.debug = debug.slice(0, 50);

  return { text, report };
}

// =========================
// Stage utilities
// =========================

function withDefaults(u: Partial<CleanOptions>): CleanOptions {
  // Deep-ish merge for removeAIMarkers
  const d = { ...defaultCleanOptions };
  const ram = u.removeAIMarkers || d.removeAIMarkers;
  return {
    ...d,
    ...u,
    removeAIMarkers: { conservative: !!ram.conservative, aggressive: !!ram.aggressive },
    symbolMap: u.symbolMap || d.symbolMap,
    aiPhraseBlacklist: u.aiPhraseBlacklist || d.aiPhraseBlacklist,
  };
}

function initRuleCounts(): Record<RuleId, number> {
  const ids: RuleId[] = [
    'normalize:line-endings', 'normalize:unicode-nfkc', 'strip:bom', 'strip:control', 'strip:invisible', 'map:nbsp-to-space',
    'ws:collapse-inline', 'ws:trim-lines', 'ws:collapse-blank-lines', 'punct:quotes', 'punct:dashes', 'punct:ellipsis',
    'punct:bullets', 'punct:fractions', 'punct:fullwidth-ascii', 'symbols:strip-nonkeyboard', 'md:flatten-headings',
    'md:flatten-emphasis', 'md:flatten-lists', 'md:flatten-links', 'md:flatten-images', 'md:strip-inline-code',
    'redact:url', 'redact:email', 'transliterate:strip-combining', 'ai:conservative', 'ai:aggressive', 'ws:final-pass',
  ];
  const o: any = {};
  ids.forEach((k) => (o[k] = 0));
  return o as Record<RuleId, number>;
}

function segmentMarkdown(text: string): Segment[] {
  const segments: Segment[] = [];
  let idx = 0;
  const fenceRe = RE.mdFence; // includes ```...``` and ~~~...~~~
  fenceRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text))) {
    if (m.index > idx) segments.push({ type: 'text', text: text.slice(idx, m.index) });
    segments.push({ type: 'codeblock', text: m[0] });
    idx = m.index + m[0].length;
  }
  if (idx < text.length) segments.push({ type: 'text', text: text.slice(idx) });

  // Split inline code within text segments
  const withInline: Segment[] = [];
  for (const seg of segments) {
    if (seg.type !== 'text') { withInline.push(seg); continue; }
    let last = 0;
    RE.mdInlineCode.lastIndex = 0;
    let mi: RegExpExecArray | null;
    while ((mi = RE.mdInlineCode.exec(seg.text))) {
      if (mi.index > last) withInline.push({ type: 'text', text: seg.text.slice(last, mi.index) });
      withInline.push({ type: 'inline', text: mi[0] });
      last = mi.index + mi[0].length;
    }
    if (last < seg.text.length) withInline.push({ type: 'text', text: seg.text.slice(last) });
  }
  return withInline;
}

function collapseBlankLines(t: string): string {
  // remove trailing spaces on lines
  t = t.replace(RE.trailWS, '\n');
  // collapse 3+ newlines to 2
  t = t.replace(RE.blankLines, '\n\n');
  return t;
}

function mapReplace(t: string, re: RegExp, rep: string, rule: RuleId, report: CleanReport): string {
  const before = t;
  t = t.replace(re, () => (incr(rule, report), rep));
  return t;
}

function applyRule(rule: RuleId, next: string, prev: string, report: CleanReport, debug: { rule: RuleId; before: string; after: string }[], opt: CleanOptions): string {
  if (next !== prev) {
    // approximate number of changes by length delta
    const delta = Math.max(1, Math.abs(next.length - prev.length));
    report.ruleCounts[rule] = (report.ruleCounts[rule] || 0) + delta;
    if (opt.debug) debug.push({ rule, before: prev, after: next });
  }
  return next;
}

function count(rule: RuleId, _t: string, report: CleanReport) {
  // heuristic: mark that this rule likely affected content
  incr(rule, report);
}

function incr(rule: RuleId, report: CleanReport): number {
  report.ruleCounts[rule] = (report.ruleCounts[rule] || 0) + 1;
  return 0;
}

function diffCount(a: string, b: string): number {
  return Math.max(0, a.length - b.length);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function performanceNow(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  } catch {}
  return Date.now();
}

function isLatinDominant(t: string): boolean {
  const letters = t.match(RE.letter)?.length || 0;
  if (!letters) return true; // default safe
  const latin = t.match(RE.latin)?.length || 0;
  return latin / letters >= 0.6;
}

function applyAIMarkers(t: string, opt: CleanOptions, report: CleanReport): string {
  const lines = t.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Conservative: drop entire line/paragraph if it matches strong AI signals
    if (opt.removeAIMarkers.conservative) {
      for (const pat of AI_CONSERVATIVE) {
        if (pat.test(line)) {
          report.ruleCounts['ai:conservative'] += 1;
          line = line
            .replace(/^(pros:|cons:|conclusion:|limitations:)\s*/i, '')
            .replace(/\b(i\s+hope\s+this\s+helps!?)\b/i, '')
            .replace(/\b(remember\s+that)\b.*$/i, '')
            .replace(/\b(as an\s+ai(?:\s+language\s+model)?)\b/i, '')
            .replace(/\b(i\s+(?:cannot|can't)\s+assist\s+with)\b/i, '')
            .replace(/\b(i\s+don['’]t\s+have\s+access\s+to\s+(?:real[- ]?time\s+data|the\s+internet))\b/i, '')
            .replace(/\b(here(?:'|’)s\s+(?:a|the)\s+step[- ]?by[- ]?step)\b/i, '')
            .replace(/\b(key\s+takeaways:)\b/i, '');
          // if line becomes only punctuation/whitespace, remove it entirely
          if (!line.trim() || /^[\p{P}\s]+$/u.test(line)) line = '';
        }
      }
    }

    // Aggressive: remove discourse lead-ins; strip templated blocks
    if (opt.removeAIMarkers.aggressive) {
      const before = line;
      line = line
        .replace(/^(certainly|absolutely|of\s+course)[!,.]*\s+/i, '')
        .replace(/^(additionally|furthermore|in\s+conclusion),\s+/i, '');
      if (before !== line) report.ruleCounts['ai:aggressive'] += 1;
    }

    // Extra blacklist from options
    for (const blk of opt.aiPhraseBlacklist) {
      const re = typeof blk === 'string' ? new RegExp(`\b${escapeRegex(blk)}\b`, 'i') : blk;
      if (re.test(line)) {
        const before = line;
        line = line.replace(re, '');
        if (line !== before) report.ruleCounts[opt.removeAIMarkers.aggressive ? 'ai:aggressive' : 'ai:conservative'] += 1;
      }
    }

    lines[i] = line;
  }

  // Remove lines that became empty via heuristics and collapse
  t = lines.filter((l) => l.trim().length > 0).join('\n');
  // Strip templated sections appearing as their own paragraphs
  if (opt.removeAIMarkers.aggressive) {
    t = t.replace(/\n(?:\s*(?:pros|cons|key\s+takeaways)\s*:\s*\n){1,}/gi, (m) => (incr('ai:aggressive', report), '\n'));
  }
  return t;
}
