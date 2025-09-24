// An extension by Nikolai Eidheim, built with WXT + TypeScript.
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
  | 'structure:flatten-headings'
  | 'structure:flatten-emphasis'
  | 'structure:flatten-lists'
  | 'structure:flatten-links'
  | 'structure:flatten-images'
  | 'structure:strip-inline-code'
  | 'structure:drop-heading-scaffold'
  | 'structure:strip-step-labels'
  | 'structure:unwrap-bullets'
  | 'tone:trim-boosters'
  | 'tone:drop-cta'
  | 'tone:trim-intros'
  | 'tone:blacklist'
  | 'tone:paragraph-drop'
  | 'redact:url'
  | 'redact:email'
  | 'transliterate:strip-combining'
  | 'ws:final-pass';

export type ToneMode = 'off' | 'gentle' | 'assertive';

export type StageId = 'standardize' | 'structure' | 'tone' | 'advanced';

export interface CleanOptions {
  tidyStructure: boolean; // soften markdown scaffolding, headings, step labels
  tone: ToneMode; // remove AI tone, intros/outros; assertive trims harder
  preserveCodeBlocks: boolean; // skip inside ```fences``` and `inline`
  stripSymbols: boolean; // remove/map emojis/arrows/math
  redactContacts: boolean; // replace URLs/emails with placeholders
  transliterateLatin: boolean; // remove \p{M} on Latin-dominant text
  ellipsisMode: 'dots' | 'dot'; // … → '...' | '.'
  symbolMap: Record<string, string>; // custom mapping for non-keyboard symbols
  aiPhraseBlacklist: (string | RegExp)[]; // extra phrases
  debug: boolean; // include simple diff snippets
}

export interface CleanReport {
  ruleCounts: Record<RuleId, number>;
  stageCounts: Record<StageId, number>;
  changes: number;
  elapsedMs?: number;
  debug?: { rule: RuleId; before: string; after: string }[];
}

export interface CleanResult {
  text: string;
  report: CleanReport;
}

export const defaultCleanOptions: CleanOptions = {
  tidyStructure: false,
  tone: 'off',
  preserveCodeBlocks: true,
  stripSymbols: false,
  redactContacts: false,
  transliterateLatin: false,
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

// Tone heuristics and scaffolding patterns
const PARAGRAPH_DROP_GENTLE: RegExp[] = [
  /\b(as an\s+ai(?:\s+language\s+model)?)/i,
  /\b(i\s+(?:cannot|can't)\s+assist\s+with)/i,
  /\b(i\s+don['’]t\s+have\s+access\s+to\s+(?:real[- ]?time\s+data|the\s+internet))/i,
  /\b(i['’]?m\s+here\s+to\s+help)/i,
  /\b(i\s+hope\s+this\s+helps!?)/i,
  /\b(let['’]s\s+dive\s+in)/i,
  /\b(here['’]s\s+what\s+we['’]ll\s+cover)/i,
  /\b(if\s+you\s+have\s+any\s+(?:other\s+)?questions)/i,
  /^(pros|cons|limitations|key\s+takeaways)\s*[:\-]/im,
];

const PARAGRAPH_DROP_ASSERTIVE: RegExp[] = [
  /^\s*(?:in\s+(?:summary|conclusion)|to\s+(?:conclude|sum\s+up)|overall|ultimately|moving\s+forward|remember\s+that)/i,
  /^\s*here['’]s\s+(?:a|the)\s+recap\b/i,
];

const CTA_PATTERNS: RegExp[] = [
  /\bfeel\s+free\s+to\s+reach\s+out\b/i,
  /\blet\s+me\s+know\s+if\s+you\s+have\s+any(?:\s+other)?\s+questions\b/i,
  /\bif\s+you\s+need\s+anything\s+else\b/i,
  /\bi['’]?m\s+happy\s+to\s+help\b/i,
  /\bi['’]?m\s+here\s+to\s+help\b/i,
];

const BOOSTER_PREFIX_PATTERNS: RegExp[] = [
  /^(?:certainly|absolutely|of\s+course|definitely|overall|additionally|furthermore|moreover|ultimately|moving\s+forward|to\s+begin\s+with|first(?:\s+off)?|to\s+start|let['’]s\s+dive\s+in|here['’]s\s+how|here['’]s\s+what\s+we['’]ll\s+cover)[,!]*\s+/i,
];

// =========================
// Public API
// =========================

export function cleanText(input: string, userOptions: Partial<CleanOptions> = {}): CleanResult {
  const start = performanceNow();
  const opt = withDefaults(userOptions);
  const report: CleanReport = { ruleCounts: initRuleCounts(), stageCounts: initStageCounts(), changes: 0 };
  const debug: DebugEntry[] = [];

  const normalizedInput = input.replace(RE.crlf, '\n');
  const lineSnap = snapshotRuleCounts(report);
  const textWithNormalizedLines = applyRule('normalize:line-endings', normalizedInput, input, report, debug, opt);
  tallyStage('standardize', lineSnap, report);

  const segments = opt.preserveCodeBlocks ? segmentMarkdown(textWithNormalizedLines) : [{ type: 'text' as SegmentType, text: textWithNormalizedLines }];
  const processed: string[] = [];

  for (const seg of segments) {
    if (seg.type !== 'text') {
      processed.push(seg.text);
      continue;
    }

    let chunk = seg.text;

    const snap = snapshotRuleCounts(report);
    chunk = runStandardizeSegment(chunk, report, debug, opt);
    tallyStage('standardize', snap, report);

    const symbolStageActive = opt.stripSymbols || (opt.symbolMap && Object.keys(opt.symbolMap).length > 0);
    if (symbolStageActive) {
      const snap = snapshotRuleCounts(report);
      chunk = runSymbolSegment(chunk, opt, report, debug);
      tallyStage('advanced', snap, report);
    }

    if (opt.tidyStructure) {
      const snap = snapshotRuleCounts(report);
      chunk = runStructureSegment(chunk, report, opt);
      tallyStage('structure', snap, report);
    }

    const toneActive = opt.tone !== 'off' || (opt.aiPhraseBlacklist && opt.aiPhraseBlacklist.length > 0);
    if (toneActive) {
      const snap = snapshotRuleCounts(report);
      chunk = runToneSegment(chunk, opt, report);
      tallyStage('tone', snap, report);
    }

    if (opt.redactContacts) {
      const snap = snapshotRuleCounts(report);
      chunk = runRedactSegment(chunk, report);
      tallyStage('advanced', snap, report);
    }

    if (opt.transliterateLatin) {
      const snap = snapshotRuleCounts(report);
      chunk = runTransliterateSegment(chunk, report);
      tallyStage('advanced', snap, report);
    }

    processed.push(chunk);
  }

  const text = processed.join('');
  const elapsedMs = performanceNow() - start;
  report.changes = Object.values(report.ruleCounts).reduce((acc, cur) => acc + cur, 0);
  report.elapsedMs = Math.round(elapsedMs);
  if (opt.debug) report.debug = debug.slice(0, 50);

  return { text, report };
}

// =========================
// Stage utilities
// =========================

type DebugEntry = { rule: RuleId; before: string; after: string };

function withDefaults(u: Partial<CleanOptions>): CleanOptions {
  const next = { ...defaultCleanOptions, ...u };
  next.tone = (u.tone ?? defaultCleanOptions.tone) as ToneMode;
  next.symbolMap = u.symbolMap ? { ...u.symbolMap } : defaultCleanOptions.symbolMap;
  next.aiPhraseBlacklist = u.aiPhraseBlacklist ? [...u.aiPhraseBlacklist] : defaultCleanOptions.aiPhraseBlacklist;
  return next;
}

function initRuleCounts(): Record<RuleId, number> {
  const ids: RuleId[] = [
    'normalize:line-endings', 'normalize:unicode-nfkc', 'strip:bom', 'strip:control', 'strip:invisible', 'map:nbsp-to-space',
    'ws:collapse-inline', 'ws:trim-lines', 'ws:collapse-blank-lines', 'punct:quotes', 'punct:dashes', 'punct:ellipsis',
    'punct:bullets', 'punct:fractions', 'punct:fullwidth-ascii', 'symbols:strip-nonkeyboard',
    'structure:flatten-headings', 'structure:flatten-emphasis', 'structure:flatten-lists', 'structure:flatten-links',
    'structure:flatten-images', 'structure:strip-inline-code', 'structure:drop-heading-scaffold', 'structure:strip-step-labels',
    'structure:unwrap-bullets', 'tone:trim-boosters', 'tone:drop-cta', 'tone:trim-intros', 'tone:blacklist', 'tone:paragraph-drop',
    'redact:url', 'redact:email', 'transliterate:strip-combining', 'ws:final-pass',
  ];
  const base: Partial<Record<RuleId, number>> = {};
  for (const id of ids) base[id] = 0;
  return base as Record<RuleId, number>;
}

function initStageCounts(): Record<StageId, number> {
  return { standardize: 0, structure: 0, tone: 0, advanced: 0 };
}

type RuleSnapshot = Record<RuleId, number>;

function snapshotRuleCounts(report: CleanReport): RuleSnapshot {
  return { ...report.ruleCounts };
}

function tallyStage(stage: StageId, before: RuleSnapshot, report: CleanReport): void {
  const delta = diffSnapshots(before, report.ruleCounts);
  if (delta > 0) report.stageCounts[stage] += delta;
}

function diffSnapshots(before: RuleSnapshot, after: Record<RuleId, number>): number {
  let total = 0;
  for (const key of Object.keys(after) as RuleId[]) {
    const prev = before[key] ?? 0;
    const next = after[key] ?? 0;
    if (next > prev) total += next - prev;
  }
  return total;
}

function runStandardizeSegment(input: string, report: CleanReport, debug: DebugEntry[], opt: CleanOptions): string {
  let t = input;

  const beforeUnicode = t;
  const unicodeNormalized = t.normalize('NFKC');
  if (unicodeNormalized !== beforeUnicode) {
    report.ruleCounts['normalize:unicode-nfkc'] += diffCount(beforeUnicode, unicodeNormalized) || 1;
    if (opt.debug) debug.push({ rule: 'normalize:unicode-nfkc', before: beforeUnicode, after: unicodeNormalized });
  }
  t = unicodeNormalized.replace(RE.bomStart, '');
  if (t.length !== unicodeNormalized.length) report.ruleCounts['strip:bom'] += 1;

  const beforeControl = t;
  t = t.replace(RE.control, '');
  if (t !== beforeControl) report.ruleCounts['strip:control'] += diffCount(beforeControl, t) || 1;

  const beforeInvisible = t;
  t = t.replace(RE.invisibles, '');
  if (t !== beforeInvisible) report.ruleCounts['strip:invisible'] += diffCount(beforeInvisible, t) || 1;

  const beforeNbsp = t;
  t = t.replace(RE.nbsp, ' ').replace(RE.nnBsp, ' ');
  if (t !== beforeNbsp) report.ruleCounts['map:nbsp-to-space'] += diffCount(beforeNbsp, t) || 1;

  const beforeTrim = t;
  t = t.replace(RE.trailWS, '\n');
  if (t !== beforeTrim) report.ruleCounts['ws:trim-lines'] += diffCount(beforeTrim, t) || 1;

  const beforeInline = t;
  t = t.replace(RE.horizWS, ' ');
  if (t !== beforeInline) report.ruleCounts['ws:collapse-inline'] += diffCount(beforeInline, t) || 1;

  const blanksBefore = (beforeInline.match(RE.blankLines) || []).length;
  const blanksAfter = (t.match(RE.blankLines) || []).length;
  if (blanksBefore > blanksAfter) report.ruleCounts['ws:collapse-blank-lines'] += blanksBefore - blanksAfter;

  t = mapReplace(t, RE.curlyDblQuotes, '"', 'punct:quotes', report);
  t = mapReplace(t, RE.curlySglQuotes, "'", 'punct:quotes', report);
  t = t.replace(RE.emDashSpaced, () => (incr('punct:dashes', report), ', '));
  t = mapReplace(t, RE.otherDashes, '-', 'punct:dashes', report);
  t = mapReplace(t, RE.ellipsis, opt.ellipsisMode === 'dot' ? '.' : '...', 'punct:ellipsis', report);
  t = mapReplace(t, RE.bullets, '-', 'punct:bullets', report);
  t = t.replace(RE.fractions, (m: string) => (incr('punct:fractions', report), FRACTION_MAP[m] || m));
  t = t.replace(RE.superscripts, (m: string) => (incr('punct:fractions', report), SUPERSCRIPT_MAP[m] || m));
  t = t.replace(RE.fullWidth, (ch: string) => {
    incr('punct:fullwidth-ascii', report);
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });

  const beforeFinal = t;
  t = collapseBlankLines(t).trim();
  if (t !== beforeFinal) report.ruleCounts['ws:final-pass'] += diffCount(beforeFinal, t) || 1;

  return t;
}

function runSymbolSegment(input: string, opt: CleanOptions, report: CleanReport, debug: DebugEntry[]): string {
  let t = input;
  const hasMap = opt.symbolMap && Object.keys(opt.symbolMap).length > 0;
  if (hasMap) {
    for (const [from, to] of Object.entries(opt.symbolMap)) {
      const re = new RegExp(escapeRegex(from), 'g');
      const before = t;
      t = t.replace(re, () => (incr('symbols:strip-nonkeyboard', report), to));
      if (before !== t && opt.debug) debug.push({ rule: 'symbols:strip-nonkeyboard', before, after: t });
    }
  }
  if (opt.stripSymbols) {
    const before = t;
    t = t.replace(RE.emoji, (m: string) => {
      const mapped = opt.symbolMap[m];
      incr('symbols:strip-nonkeyboard', report);
      return mapped ?? '';
    });
    if (before !== t && opt.debug) debug.push({ rule: 'symbols:strip-nonkeyboard', before, after: t });
  }
  return t;
}

const STRUCTURE_SCAFFOLD_RE = /^(outline|key takeaways|summary|conclusion|final thoughts|next steps|quick recap|pros|cons|limitations|what['’]s next)[:\-\s]*$/i;
const STRUCTURE_STEP_RE = /^(?:step|phase|part|section)\s+\d+(?:\s*[-:])\s*/i;
const BULLET_PREFIX_RE = /^[\-•·‣▪]+\s+/;

function runStructureSegment(input: string, report: CleanReport, opt: CleanOptions): string {
  let t = input;

  const headingCount = countMatches(RE.mdHeading, t);
  if (headingCount) {
    report.ruleCounts['structure:flatten-headings'] += headingCount;
    t = t.replace(RE.mdHeading, '$1');
  }

  const emphasisCount = countMatches(RE.mdEmphasis, t);
  if (emphasisCount) {
    report.ruleCounts['structure:flatten-emphasis'] += emphasisCount;
    t = t.replace(RE.mdEmphasis, '$2');
  }

  const listCount = countMatches(RE.mdListMarker, t);
  if (listCount) {
    report.ruleCounts['structure:flatten-lists'] += listCount;
    t = t.replace(RE.mdListMarker, (_m: string, indent: string) => indent);
  }

  const imageCount = countMatches(RE.mdImage, t);
  if (imageCount) {
    report.ruleCounts['structure:flatten-images'] += imageCount;
    t = t.replace(RE.mdImage, (_m: string, alt: string) => alt || '');
  }

  const linkCount = countMatches(RE.mdLink, t);
  if (linkCount) {
    report.ruleCounts['structure:flatten-links'] += linkCount;
    t = t.replace(RE.mdLink, (_m: string, txt: string) => txt);
  }

  if (!opt.preserveCodeBlocks) {
    const inlineCount = countMatches(RE.mdInlineCode, t);
    if (inlineCount) {
      report.ruleCounts['structure:strip-inline-code'] += inlineCount;
      t = t.replace(RE.mdInlineCode, (m: string) => m.slice(1, -1));
    }
  }

  const lines = t.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    let content = line.slice(indent.length);
    const trimmed = content.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }

    if (STRUCTURE_SCAFFOLD_RE.test(trimmed)) {
      incr('structure:drop-heading-scaffold', report);
      continue;
    }

    const beforeStep = content;
    content = content.replace(STRUCTURE_STEP_RE, '');
    if (content !== beforeStep) incr('structure:strip-step-labels', report);

    const beforeBullet = content;
    if (BULLET_PREFIX_RE.test(content.trimStart())) {
      content = content.replace(BULLET_PREFIX_RE, '');
      incr('structure:unwrap-bullets', report);
    }

    if (!content.trim()) continue;
    out.push(indent + content.trimStart());
  }

  return collapseBlankLines(out.join('\n'));
}

function runToneSegment(input: string, opt: CleanOptions, report: CleanReport): string {
  if (opt.tone === 'off') {
    return applyBlacklist(input, opt, report);
  }

  const paragraphs = input.split(/\n{2,}/);
  const kept: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (shouldDropParagraph(trimmed, opt.tone)) {
      incr('tone:paragraph-drop', report);
      continue;
    }

    let updated = stripBoosterLeadIns(para, report);
    updated = removeCTAPhrases(updated, report);

    if (opt.tone === 'assertive') {
      updated = updated.replace(/\b(?:in\s+(?:summary|conclusion)|to\s+(?:conclude|sum\s+up)|overall)[:,]?\s+/gi, (match) => {
        incr('tone:trim-intros', report);
        return '';
      });
    }

    updated = applyBlacklist(updated, opt, report);

    if (updated.trim()) kept.push(updated.trimEnd());
  }

  return kept.join('\n\n');
}

function shouldDropParagraph(paragraph: string, mode: ToneMode): boolean {
  for (const re of PARAGRAPH_DROP_GENTLE) {
    if (re.test(paragraph)) return true;
  }
  if (CTA_PATTERNS.some((re) => re.test(paragraph)) && wordCount(paragraph) <= 25) return true;
  if (mode === 'assertive') {
    for (const re of PARAGRAPH_DROP_ASSERTIVE) {
      if (re.test(paragraph)) return true;
    }
  }
  return false;
}

function stripBoosterLeadIns(text: string, report: CleanReport): string {
  const lines = text.split('\n');
  const next: string[] = [];
  for (const line of lines) {
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    let content = line.slice(indent.length);
    let changed = false;
    for (const re of BOOSTER_PREFIX_PATTERNS) {
      if (re.test(content)) {
        content = content.replace(re, '');
        changed = true;
        break;
      }
    }
    if (changed) incr('tone:trim-boosters', report);
    next.push(indent + content);
  }
  return next.join('\n');
}

function removeCTAPhrases(text: string, report: CleanReport): string {
  let result = text;
  for (const re of CTA_PATTERNS) {
    result = result.replace(re, () => {
      incr('tone:drop-cta', report);
      return '';
    });
  }
  return result;
}

function applyBlacklist(text: string, opt: CleanOptions, report: CleanReport): string {
  if (!opt.aiPhraseBlacklist || !opt.aiPhraseBlacklist.length) return text;
  let result = text;
  for (const pattern of opt.aiPhraseBlacklist) {
    const re = toGlobalRegex(pattern);
    result = result.replace(re, () => {
      incr('tone:blacklist', report);
      return '';
    });
  }
  return result;
}

function toGlobalRegex(pattern: string | RegExp): RegExp {
  if (typeof pattern === 'string') return new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'gi');
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function runRedactSegment(input: string, report: CleanReport): string {
  let t = input;
  t = t.replace(RE.url, () => (incr('redact:url', report), '<URL>'));
  t = t.replace(RE.email, () => (incr('redact:email', report), '<EMAIL>'));
  return t;
}

function runTransliterateSegment(input: string, report: CleanReport): string {
  if (!isLatinDominant(input)) return input;
  const before = input;
  const stripped = input.normalize('NFD').replace(RE.combining, '').normalize('NFC');
  if (before !== stripped) report.ruleCounts['transliterate:strip-combining'] += 1;
  return stripped;
}

function segmentMarkdown(text: string): Segment[] {
  const segments: Segment[] = [];
  let idx = 0;
  const fenceRe = RE.mdFence;
  fenceRe.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text))) {
    if (match.index > idx) segments.push({ type: 'text', text: text.slice(idx, match.index) });
    segments.push({ type: 'codeblock', text: match[0] });
    idx = match.index + match[0].length;
  }
  if (idx < text.length) segments.push({ type: 'text', text: text.slice(idx) });

  const withInline: Segment[] = [];
  for (const seg of segments) {
    if (seg.type !== 'text') {
      withInline.push(seg);
      continue;
    }
    let last = 0;
    RE.mdInlineCode.lastIndex = 0;
    let inline: RegExpExecArray | null;
    while ((inline = RE.mdInlineCode.exec(seg.text))) {
      if (inline.index > last) withInline.push({ type: 'text', text: seg.text.slice(last, inline.index) });
      withInline.push({ type: 'inline', text: inline[0] });
      last = inline.index + inline[0].length;
    }
    if (last < seg.text.length) withInline.push({ type: 'text', text: seg.text.slice(last) });
  }
  return withInline;
}

function collapseBlankLines(t: string): string {
  const withoutTrail = t.replace(RE.trailWS, '\n');
  return withoutTrail.replace(RE.blankLines, '\n\n');
}

function mapReplace(t: string, re: RegExp, rep: string, rule: RuleId, report: CleanReport): string {
  return t.replace(re, () => (incr(rule, report), rep));
}

function applyRule(rule: RuleId, next: string, prev: string, report: CleanReport, debug: DebugEntry[], opt: CleanOptions): string {
  if (next !== prev) {
    const delta = Math.max(1, Math.abs(next.length - prev.length));
    report.ruleCounts[rule] = (report.ruleCounts[rule] || 0) + delta;
    if (opt.debug) debug.push({ rule, before: prev, after: next });
  }
  return next;
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
  if (!letters) return true;
  const latin = t.match(RE.latin)?.length || 0;
  return latin / letters >= 0.6;
}

function countMatches(re: RegExp, text: string): number {
  let count = 0;
  re.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) count += 1;
  re.lastIndex = 0;
  return count;
}

function wordCount(text: string): number {
  return (text.match(/\b\w+\b/g) || []).length;
}
