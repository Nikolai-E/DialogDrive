// An extension by Nikolai Eidheim, built with WXT + TypeScript.
/**
 * TextCleaner — structural text normalizer for Markdown, HTML fragments, and plain text.
 *
 * Focuses exclusively on structure, punctuation, and whitespace adjustments. Words stay intact.
 * The cleaner is deterministic, idempotent, and safe to run repeatedly.
 *
 * Pipeline overview:
 *   1. Preprocess (strip ANSI, decode entities, normalize Unicode, remove format characters)
 *   2. Parse (HTML sanitisation hooks, Markdown/HTML/Plain detection)
 *   3. Transform structure (links, lists, code blocks, structural drops)
 *   4. Punctuation mapping
 *   5. Whitespace normalisation
 *   6. Fallback Markdown stripping when structured parsing fails
 *
 * The implementation keeps dependencies optional. A caller may provide a Markdown/HTML engine via
 * runtime options (remark/unified + rehype is ideal). When unavailable we rely on deterministic
 * lightweight parsers.
 */

export type CleanPreset = 'plain' | 'email' | 'markdown-slim' | 'chat' | 'custom';

export type LinkMode = 'keepMarkdown' | 'textWithUrl' | 'textOnly';
export type ListMode = 'unwrapToSentences' | 'keepBullets' | 'keepNumbers';
export type InlineCodeMode = 'keepMarkers' | 'stripMarkers';
export type BlockCodeMode = 'drop' | 'indent';

export interface PunctuationOptions {
  mapEmDash: 'comma' | 'hyphen' | 'keep';
  mapEnDash: 'hyphen' | 'keep';
  curlyQuotes: 'straight' | 'keep';
  ellipsis: 'dots' | 'keep' | 'remove';
}

export interface StructureOptions {
  dropHeadings: boolean;
  dropTables: boolean;
  dropFootnotes: boolean;
  dropBlockquotes: boolean;
  dropHorizontalRules: boolean;
  stripEmojis: boolean;
  keepBasicMarkdown: boolean;
}

export interface WhitespaceOptions {
  collapseSpaces: boolean;
  collapseBlankLines: boolean;
  trim: boolean;
  normalizeNbsp: boolean;
  ensureFinalNewline: boolean;
}

export interface CleanOptions {
  preset: CleanPreset;
  locale: string;
  linkMode: LinkMode;
  listMode: ListMode;
  inlineCode: InlineCodeMode;
  blockCode: BlockCodeMode;
  redactContacts: boolean;
  punctuation: PunctuationOptions;
  structure: StructureOptions;
  whitespace: WhitespaceOptions;
}

export interface CleanerRuntimeOptions {
  sanitizeHtml?: (html: string) => string;
  markdownToAst?: (markdown: string) => MarkdownAst | null;
  renderMarkdownAst?: (ast: MarkdownAst, options: InternalRenderOptions) => string;
}

export type StageId = 'preprocess' | 'structure' | 'punctuation' | 'whitespace' | 'fallback';

export type RuleId =
  | 'pre:strip-ansi'
  | 'pre:decode-entities'
  | 'pre:normalize-nfc'
  | 'pre:strip-format-chars'
  | 'parse:sanitize-html'
  | 'parse:html-to-text'
  | 'structure:heading-drop'
  | 'structure:heading-inline-strip'
  | 'structure:list-render'
  | 'structure:link-render'
  | 'structure:inline-code'
  | 'structure:block-code'
  | 'structure:horizontal-rule'
  | 'structure:horizontal-rule-inline-strip'
  | 'structure:table-drop'
  | 'structure:footnote-drop'
  | 'structure:blockquote-normalize'
  | 'structure:inline-markup'
  | 'structure:emoji-strip'
  | 'privacy:redact-url'
  | 'privacy:redact-email'
  | 'punct:emdash'
  | 'punct:endash'
  | 'punct:quotes'
  | 'punct:ellipsis'
  | 'whitespace:nbsp'
  | 'whitespace:inline'
  | 'whitespace:blank-lines'
  | 'whitespace:trim'
  | 'whitespace:final-newline'
  | 'fallback:strip-markdown';

export interface CleanReport {
  ruleCounts: Record<RuleId, number>;
  stageCounts: Record<StageId, number>;
  changes: number;
  elapsedMs?: number;
}

export interface CleanResult {
  text: string;
  report: CleanReport;
}

/**
 * Default preset mirrors the "plain" mode: plain text output with punctuation smoothing.
 */
export const defaultCleanOptions: CleanOptions = {
  preset: 'plain',
  locale: 'nb-NO',
  linkMode: 'textOnly',
  listMode: 'unwrapToSentences',
  inlineCode: 'stripMarkers',
  blockCode: 'drop',
  redactContacts: false,
  punctuation: {
    mapEmDash: 'comma',
    mapEnDash: 'hyphen',
    curlyQuotes: 'straight',
    ellipsis: 'dots',
  },
  structure: {
    dropHeadings: true,
    dropTables: true,
    dropFootnotes: true,
    dropBlockquotes: true,
    dropHorizontalRules: true,
    stripEmojis: false,
    keepBasicMarkdown: false,
  },
  whitespace: {
    collapseSpaces: true,
    collapseBlankLines: true,
    trim: true,
    normalizeNbsp: true,
    ensureFinalNewline: true,
  },
};

export type CleanerPresetMap = Record<Exclude<CleanPreset, 'custom'>, Partial<CleanOptions>>;

export const cleanerPresets: CleanerPresetMap = {
  plain: {
    preset: 'plain',
    linkMode: 'textOnly',
    listMode: 'unwrapToSentences',
    inlineCode: 'stripMarkers',
    blockCode: 'drop',
    structure: {
      dropHeadings: true,
      dropTables: true,
      dropFootnotes: true,
      dropBlockquotes: true,
      dropHorizontalRules: true,
      stripEmojis: false,
      keepBasicMarkdown: false,
    },
  },
  email: {
    preset: 'email',
    linkMode: 'textWithUrl',
    listMode: 'keepBullets',
    inlineCode: 'stripMarkers',
    blockCode: 'indent',
    redactContacts: false,
    structure: {
      dropHeadings: true,
      dropTables: true,
      dropFootnotes: true,
      dropBlockquotes: true,
      dropHorizontalRules: true,
      stripEmojis: false,
      keepBasicMarkdown: false,
    },
  },
  'markdown-slim': {
    preset: 'markdown-slim',
    linkMode: 'keepMarkdown',
    listMode: 'keepBullets',
    inlineCode: 'keepMarkers',
    blockCode: 'drop',
    redactContacts: false,
    structure: {
      dropHeadings: true,
      dropTables: true,
      dropFootnotes: true,
      dropBlockquotes: true,
      dropHorizontalRules: false,
      stripEmojis: false,
      keepBasicMarkdown: true,
    },
    whitespace: {
      collapseSpaces: true,
      collapseBlankLines: true,
      trim: true,
      normalizeNbsp: true,
      ensureFinalNewline: false,
    },
  },
  chat: {
    preset: 'chat',
    linkMode: 'textOnly',
    listMode: 'unwrapToSentences',
    inlineCode: 'stripMarkers',
    blockCode: 'drop',
    redactContacts: false,
    structure: {
      dropHeadings: true,
      dropTables: true,
      dropFootnotes: true,
      dropBlockquotes: false,
      dropHorizontalRules: true,
      stripEmojis: false,
      keepBasicMarkdown: false,
    },
    whitespace: {
      collapseSpaces: true,
      collapseBlankLines: false,
      trim: true,
      normalizeNbsp: true,
      ensureFinalNewline: false,
    },
  },
};

/**
 * Resolve user overrides against defaults + preset defaults. Any mutation that diverges from a preset
 * should set preset="custom" externally.
 */
export function resolveCleanOptions(partial: Partial<CleanOptions> | undefined): CleanOptions {
  if (!partial)
    return {
      ...defaultCleanOptions,
      structure: { ...defaultCleanOptions.structure },
      whitespace: { ...defaultCleanOptions.whitespace },
      punctuation: { ...defaultCleanOptions.punctuation },
    };

  const fallbackPreset: Exclude<CleanPreset, 'custom'> =
    defaultCleanOptions.preset === 'custom' ? 'plain' : defaultCleanOptions.preset;
  const presetKey: Exclude<CleanPreset, 'custom'> =
    partial.preset && partial.preset !== 'custom' ? partial.preset : fallbackPreset;
  const presetDefaults = cleanerPresets[presetKey] ?? {};

  return mergeOptions(defaultCleanOptions, presetDefaults, partial);
}

/**
 * Maximum input size in characters to prevent performance issues.
 */
const MAX_INPUT_SIZE = 100000;

/**
 * Main entry point.
 */
export function cleanText(
  input: string,
  userOptions: Partial<CleanOptions> = {},
  runtime: CleanerRuntimeOptions = {}
): CleanResult {
  const start = performanceNow();
  const options = resolveCleanOptions(userOptions);
  const report = createEmptyReport();

  try {
    const source = input ?? '';
    
    // Prevent crashes on extremely large inputs
    if (source.length > MAX_INPUT_SIZE) {
      const truncated = source.slice(0, MAX_INPUT_SIZE);
      const elapsed = performanceNow() - start;
      report.elapsedMs = elapsed;
      return {
        text: truncated + '\n\n[... Input truncated at ' + MAX_INPUT_SIZE.toLocaleString() + ' characters ...]',
        report,
      };
    }

    // Prevent null/undefined crashes
    if (!source || source.length === 0) {
      report.elapsedMs = performanceNow() - start;
      return { text: '', report };
    }
  const preprocessed = preprocess(source, options, report);

  const parsed = parse(preprocessed, options, runtime, report);
  let structured = transformStructure(parsed, options, report);

  if ((!parsed.blocks || parsed.blocks.length === 0) && parsed.kind !== 'plain') {
    const stripped = fallbackStripMarkdown(parsed.text, report);
    structured = transformInline(stripped, options, report);
  }

  const redacted = options.redactContacts
    ? applyRedactions(structured, options, report)
    : structured;

    const punctuated = normalizePunctuation(redacted, options, report);
    const whitespaceNormalised = normalizeWhitespace(punctuated, options, report);

    const elapsed = performanceNow() - start;
    report.elapsedMs = elapsed;

    // Timeout protection - if processing took too long, something might be wrong
    if (elapsed > 30000) {
      console.warn(`Text cleaning took ${elapsed}ms - possible performance issue`);
    }

    return {
      text: whitespaceNormalised,
      report,
    };
  } catch (error) {
    // Emergency fallback - return sanitized input if anything crashes
    const elapsed = performanceNow() - start;
    report.elapsedMs = elapsed;
    console.error('Text cleaning error:', error);
    
    // Return minimal safe output
    const safeText = (input ?? '')
      .slice(0, MAX_INPUT_SIZE)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control chars
      .trim();
    
    return {
      text: safeText + '\n\n[Error during text cleaning - showing sanitized input]',
      report,
    };
  }
}// =========================
// Pipeline stages
// =========================

type DocumentKind = 'html' | 'markdown' | 'plain';

interface ParsedDocument {
  kind: DocumentKind;
  text: string;
  blocks?: Block[];
  ast?: MarkdownAst | null;
}

type MarkdownAst = unknown;

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; depth: number; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; content: string; fenced: boolean }
  | { type: 'rule'; marker: string }
  | { type: 'blockquote'; blocks: Block[] }
  | { type: 'table'; rows: string[] }
  | { type: 'footnote'; label: string; text: string };

interface InternalRenderOptions {
  options: CleanOptions;
  report: CleanReport;
}

function preprocess(input: string, options: CleanOptions, report: CleanReport): string {
  let text = input;

  const ansiResult = stripAnsi(text);
  if (ansiResult.count > 0) {
    bump(report, 'preprocess', 'pre:strip-ansi', ansiResult.count);
    text = ansiResult.text;
  }

  const decoded = decodeEntities(text);
  if (decoded.changed) {
    bump(report, 'preprocess', 'pre:decode-entities', decoded.count);
    text = decoded.text;
  }

  const normalised = normalizeToNfc(text);
  if (normalised.changed) {
    bump(report, 'preprocess', 'pre:normalize-nfc', normalised.count);
    text = normalised.text;
  }

  const strippedFormat = stripFormatCharacters(text);
  if (strippedFormat.count > 0) {
    bump(report, 'preprocess', 'pre:strip-format-chars', strippedFormat.count);
    text = strippedFormat.text;
  }

  return text;
}

function parse(
  text: string,
  options: CleanOptions,
  runtime: CleanerRuntimeOptions,
  report: CleanReport
): ParsedDocument {
  const trimmed = text.trim();
  if (!trimmed) {
    return { kind: 'plain', text: '', blocks: [] };
  }

  if (looksLikeHtml(trimmed)) {
    const sanitized = sanitizeHtml(trimmed, runtime);
    if (sanitized !== trimmed) {
      bump(report, 'preprocess', 'parse:sanitize-html', 1);
    }
    const asText = htmlToText(sanitized);
    if (asText !== sanitized) {
      bump(report, 'preprocess', 'parse:html-to-text', 1);
    }
    return { kind: 'html', text: asText, blocks: parseMarkdownLike(asText) };
  }

  if (looksLikeMarkdown(trimmed)) {
    const ast = runtime.markdownToAst ? runtime.markdownToAst(trimmed) : null;
    return { kind: 'markdown', text: trimmed, blocks: parseMarkdownLike(trimmed), ast };
  }

  return { kind: 'plain', text: trimmed, blocks: parseMarkdownLike(trimmed) };
}

function transformStructure(
  doc: ParsedDocument,
  options: CleanOptions,
  report: CleanReport
): string {
  if (!doc.blocks || doc.blocks.length === 0) {
    const inline = transformInline(doc.text, options, report);
    return inline;
  }

  const lines: string[] = [];

  for (const block of doc.blocks) {
    switch (block.type) {
      case 'heading': {
        if (options.structure.dropHeadings) {
          // Keep the heading text content, just remove the heading markers
          const renderedText = transformInline(block.text, options, report);
          if (renderedText.trim()) {
            pushBlockLines([renderedText], lines);
          }
          bump(report, 'structure', 'structure:heading-drop', 1);
          break;
        }
        const renderedHeading = renderHeading(block, options, report);
        pushBlockLines(renderedHeading, lines);
        break;
      }
      case 'paragraph': {
        const renderedParagraph = transformInline(block.text, options, report);
        pushBlockLines([renderedParagraph], lines);
        break;
      }
      case 'list': {
        const renderedList = renderList(block, options, report);
        pushBlockLines(renderedList, lines);
        break;
      }
      case 'rule': {
        const renderedRule = renderRule(block, options, report);
        if (renderedRule.length === 0) break;
        pushBlockLines(renderedRule, lines);
        break;
      }
      case 'code': {
        const renderedCode = renderCode(block, options, report);
        if (renderedCode.length === 0) break;
        pushBlockLines(renderedCode, lines);
        break;
      }
      case 'blockquote': {
        const renderedQuote = renderBlockquote(block, options, report);
        if (renderedQuote.length === 0) break;
        pushBlockLines(renderedQuote, lines);
        break;
      }
      case 'table': {
        if (options.structure.dropTables) {
          // Keep table text content, just remove table formatting
          const renderedTable = renderTable(block, options, report);
          if (renderedTable.length > 0) {
            pushBlockLines(renderedTable, lines);
          }
          bump(report, 'structure', 'structure:table-drop', 1);
          break;
        }
        const renderedTable = renderTable(block, options, report);
        pushBlockLines(renderedTable, lines);
        break;
      }
      case 'footnote': {
        if (options.structure.dropFootnotes) {
          // Keep footnote text, just remove footnote markers
          const renderedText = transformInline(block.text, options, report);
          if (renderedText.trim()) {
            pushBlockLines([renderedText], lines);
          }
          bump(report, 'structure', 'structure:footnote-drop', 1);
          break;
        }
        const renderedFootnote = renderFootnote(block, options, report);
        pushBlockLines(renderedFootnote, lines);
        break;
      }
      default: {
        // Exhaustive guard
        const _never: never = block;
        void _never;
        break;
      }
    }
  }

  const joined = lines.join('\n');
  return joined;
}

function normalizePunctuation(input: string, options: CleanOptions, report: CleanReport): string {
  let text = input;

  if (options.punctuation.mapEmDash === 'comma') {
    const result = replaceEmDashWithComma(text);
    if (result.count > 0) {
      bump(report, 'punctuation', 'punct:emdash', result.count);
      text = result.text;
    }
  } else if (options.punctuation.mapEmDash === 'hyphen') {
    const result = replaceWithCounter(text, /—/g, '-');
    if (result.count > 0) {
      bump(report, 'punctuation', 'punct:emdash', result.count);
      text = result.text;
    }
  }

  if (options.punctuation.mapEnDash === 'hyphen') {
    const result = replaceWithCounter(text, /[–‑−]/g, '-');
    if (result.count > 0) {
      bump(report, 'punctuation', 'punct:endash', result.count);
      text = result.text;
    }
  }

  if (options.punctuation.curlyQuotes === 'straight') {
    const dbl = replaceWithCounter(text, /[“”«»„]/g, '"');
    if (dbl.count > 0) {
      bump(report, 'punctuation', 'punct:quotes', dbl.count);
      text = dbl.text;
    }
    const sgl = replaceWithCounter(text, /[‘’‚‹›]/g, "'");
    if (sgl.count > 0) {
      bump(report, 'punctuation', 'punct:quotes', sgl.count);
      text = sgl.text;
    }
  }

  if (options.punctuation.ellipsis !== 'keep') {
    if (options.punctuation.ellipsis === 'dots') {
      const result = replaceWithCounter(text, /…/g, '...');
      if (result.count > 0) {
        bump(report, 'punctuation', 'punct:ellipsis', result.count);
        text = result.text;
      }
    } else {
      const result = replaceWithCounter(text, /…/g, '');
      if (result.count > 0) {
        bump(report, 'punctuation', 'punct:ellipsis', result.count);
        text = result.text;
      }
    }
  }

  return text;
}

function normalizeWhitespace(input: string, options: CleanOptions, report: CleanReport): string {
  let text = input;

  if (options.whitespace.normalizeNbsp) {
    const result = normalizeNbsp(text);
    if (result.count > 0) {
      bump(report, 'whitespace', 'whitespace:nbsp', result.count);
      text = result.text;
    }
  }

  if (options.whitespace.collapseSpaces) {
    const result = replaceWithCounter(text, /[ \t]{2,}/g, ' ');
    if (result.count > 0) {
      bump(report, 'whitespace', 'whitespace:inline', result.count);
      text = result.text;
    }
  }

  if (options.whitespace.collapseBlankLines) {
    const result = replaceWithCounter(text, /\n{3,}/g, '\n\n');
    if (result.count > 0) {
      bump(report, 'whitespace', 'whitespace:blank-lines', result.count);
      text = result.text;
    }
  }

  if (options.whitespace.trim) {
    const trimmed = text.trim();
    if (trimmed !== text) {
      const diff = Math.max(1, text.length - trimmed.length);
      bump(report, 'whitespace', 'whitespace:trim', diff);
      text = trimmed;
    }
  }

  if (options.whitespace.ensureFinalNewline) {
    if (!text.endsWith('\n')) {
      text = `${text}\n`;
      bump(report, 'whitespace', 'whitespace:final-newline', 1);
    }
  }

  return text;
}

// =========================
// Rendering helpers
// =========================

function renderHeading(
  block: Extract<Block, { type: 'heading' }>,
  options: CleanOptions,
  report: CleanReport
): string[] {
  const rendered = transformInline(block.text, options, report);
  if (options.structure.keepBasicMarkdown) {
    const marker = '#'.repeat(Math.max(1, Math.min(6, block.depth)));
    return [`${marker} ${rendered}`];
  }
  return [rendered];
}

function renderList(
  block: Extract<Block, { type: 'list' }>,
  options: CleanOptions,
  report: CleanReport
): string[] {
  const items = block.items.map((item) => transformInline(item, options, report));
  const mode = options.listMode;
  const lines: string[] = [];

  const pushBullets = () => {
    items.forEach((item) => {
      const trimmed = item.trim();
      if (!trimmed) return;
      const prefix = options.structure.keepBasicMarkdown ? '-' : '•';
      lines.push(`${prefix} ${trimmed}`);
    });
  };

  const pushNumbers = () => {
    let index = 1;
    items.forEach((item) => {
      const trimmed = item.trim();
      if (!trimmed) return;
      const prefix = `${index}.`;
      lines.push(`${prefix} ${trimmed}`);
      index += 1;
    });
  };

  if (mode === 'unwrapToSentences') {
    if (items.length > 0) {
      const sentenceEndRegex = /[.!?](?:["'”’)]?)$/;
      const segments = items.flatMap((item) => segmentSentences(item, options.locale));
      const trimmedSegments = segments.map((segment) => segment.trim()).filter(Boolean);
      const canUnwrap =
        trimmedSegments.length === 1 ||
        trimmedSegments.every((segment) => sentenceEndRegex.test(segment));

      if (canUnwrap) {
        const joined = trimmedSegments.join(' ').trim();
        if (joined) lines.push(joined);
      } else if (block.ordered) {
        pushNumbers();
      } else {
        pushBullets();
      }
    }
  } else if (mode === 'keepBullets') {
    pushBullets();
  } else {
    pushNumbers();
  }

  bump(report, 'structure', 'structure:list-render', items.length);
  return lines;
}

function renderRule(
  block: Extract<Block, { type: 'rule' }>,
  options: CleanOptions,
  report: CleanReport
): string[] {
  if (options.structure.dropHorizontalRules) {
    bump(report, 'structure', 'structure:horizontal-rule', 1);
    return [];
  }

  const marker = options.structure.keepBasicMarkdown ? block.marker : '---';
  return [marker];
}

function renderCode(
  block: Extract<Block, { type: 'code' }>,
  options: CleanOptions,
  report: CleanReport
): string[] {
  const lines = block.content.split(/\r?\n/);
  
  if (options.blockCode === 'drop') {
    // Keep code content as plain text, preserving meaningful lines
    bump(report, 'structure', 'structure:block-code', 1);
    const meaningfulLines = lines.filter(line => line.trim());
    // If code block is small, keep it inline; otherwise add spacing
    if (meaningfulLines.length > 0) {
      return meaningfulLines;
    }
    return [];
  }
  
  // Indent mode - add 4 spaces to each line
  const indented = lines.map((line) => (line ? `    ${line}` : ''));
  bump(report, 'structure', 'structure:block-code', indented.length);
  return indented;
}

function renderBlockquote(
  block: Extract<Block, { type: 'blockquote' }>,
  options: CleanOptions,
  report: CleanReport
): string[] {
  const renderedChildren = block.blocks.flatMap((child) => {
    if (child.type === 'blockquote') return renderBlockquote(child, options, report);
    return renderGenericBlock(child, options, report);
  });

  if (options.structure.dropBlockquotes) {
    bump(report, 'structure', 'structure:blockquote-normalize', 1);
    return renderedChildren;
  }

  const prefix = options.structure.keepBasicMarkdown ? '> ' : '';
  const quoted = renderedChildren.map((line) => (prefix ? `${prefix}${line}` : line));
  bump(report, 'structure', 'structure:blockquote-normalize', renderedChildren.length);
  return quoted;
}

function renderTable(
  block: Extract<Block, { type: 'table' }>,
  options: CleanOptions,
  report: CleanReport
): string[] {
  const rendered = block.rows.map((row) => transformInline(row, options, report));
  bump(report, 'structure', 'structure:inline-markup', rendered.length);
  return rendered;
}

function renderFootnote(
  block: Extract<Block, { type: 'footnote' }>,
  options: CleanOptions,
  report: CleanReport
): string[] {
  const rendered = transformInline(block.text, options, report);
  bump(report, 'structure', 'structure:inline-markup', 1);
  if (options.structure.keepBasicMarkdown) {
    return [`[^${block.label}]: ${rendered}`];
  }
  return [`${block.label}. ${rendered}`];
}

function renderGenericBlock(block: Block, options: CleanOptions, report: CleanReport): string[] {
  switch (block.type) {
    case 'paragraph':
      return [transformInline(block.text, options, report)];
    case 'heading':
      return renderHeading(block, options, report);
    case 'list':
      return renderList(block, options, report);
    case 'rule':
      return renderRule(block, options, report);
    case 'code':
      return renderCode(block, options, report);
    case 'blockquote':
      return renderBlockquote(block, options, report);
    case 'table':
      return renderTable(block, options, report);
    case 'footnote':
      return renderFootnote(block, options, report);
    default:
      return [];
  }
}

function pushBlockLines(blockLines: string[], output: string[]): void {
  if (blockLines.length === 0) return;
  // Add blank line between blocks for readability, unless the last line is already blank
  if (output.length > 0 && blockLines[0].trim()) {
    const lastLine = output[output.length - 1];
    if (lastLine && lastLine.trim()) {
      output.push('');
    }
  }
  output.push(...blockLines);
}

// =========================
// Inline handling
// =========================

function transformInline(input: string, options: CleanOptions, report: CleanReport): string {
  let text = input;

  const linkResult = transformLinks(text, options.linkMode);
  if (linkResult.count > 0) {
    bump(report, 'structure', 'structure:link-render', linkResult.count);
    text = linkResult.text;
  }

  const inlineCodeResult = transformInlineCode(text, options.inlineCode);
  if (inlineCodeResult.count > 0) {
    bump(report, 'structure', 'structure:inline-code', inlineCodeResult.count);
    text = inlineCodeResult.text;
  }

  if (!options.structure.keepBasicMarkdown) {
    const emphasisResult = stripEmphasis(text);
    if (emphasisResult.count > 0) {
      bump(report, 'structure', 'structure:inline-markup', emphasisResult.count);
      text = emphasisResult.text;
    }

    // Strip inline heading markers when dropHeadings is enabled
    if (options.structure.dropHeadings) {
      const headingResult = replaceWithCounter(text, /#{1,6}\s+/g, '');
      if (headingResult.count > 0) {
        bump(report, 'structure', 'structure:heading-inline-strip', headingResult.count);
        text = headingResult.text;
      }
    }

    // Strip horizontal rule markers when dropHorizontalRules is enabled
    if (options.structure.dropHorizontalRules) {
      const ruleResult = replaceWithCounter(text, /(?:[-*_]){3,}/g, '');
      if (ruleResult.count > 0) {
        bump(report, 'structure', 'structure:horizontal-rule-inline-strip', ruleResult.count);
        text = ruleResult.text;
      }
    }
  }

  if (options.structure.stripEmojis) {
    const emojiResult = stripEmojis(text);
    if (emojiResult.count > 0) {
      bump(report, 'structure', 'structure:emoji-strip', emojiResult.count);
      text = emojiResult.text;
    }
  }

  return text;
}

function transformLinks(input: string, mode: LinkMode): { text: string; count: number } {
  if (!input || input.length === 0) return { text: '', count: 0 };
  
  // Safety: limit iterations to prevent infinite loops
  const maxIterations = 10000;
  let iterations = 0;
  
  // Match markdown links: [text](url) or [text](url "title")
  const regex = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  let count = 0;
  const replaced = input.replace(regex, (_match, label, url) => {
    if (++iterations > maxIterations) {
      console.warn('Link transform exceeded max iterations');
      return _match; // Return original to prevent hang
    }
    count += 1;
    const cleanLabel = (label || '').trim();
    const cleanUrl = (url || '').trim();
    
    if (mode === 'keepMarkdown') {
      return `[${cleanLabel}](${cleanUrl})`;
    }
    if (mode === 'textWithUrl') {
      if (!cleanLabel) return cleanUrl;
      if (cleanLabel === cleanUrl) return cleanUrl;
      return `${cleanLabel} (${cleanUrl})`;
    }
    // textOnly mode - just return the label
    return cleanLabel || cleanUrl || '';
  });
  return { text: replaced, count };
}

function transformInlineCode(input: string, mode: InlineCodeMode): { text: string; count: number } {
  if (mode === 'keepMarkers') {
    return { text: input, count: 0 };
  }
  const regex = /`([^`]+)`/g;
  let count = 0;
  const replaced = input.replace(regex, (_match, code) => {
    count += 1;
    return code;
  });
  return { text: replaced, count };
}

function stripEmphasis(input: string): { text: string; count: number } {
  if (!input || input.length === 0) return { text: '', count: 0 };
  if (input.length > 50000) {
    // For very large inputs, use simpler non-regex approach to avoid catastrophic backtracking
    return { text: input, count: 0 };
  }
  
  const regex = /([*_~]{1,3})([^*_~\n][^\n]*?)(\1)/g;
  let count = 0;
  
  try {
    const replaced = input.replace(regex, (_match, _open, content) => {
      count += 1;
      return content;
    });
    return { text: replaced, count };
  } catch (error) {
    console.warn('stripEmphasis failed, returning original:', error);
    return { text: input, count: 0 };
  }
}

function stripEmojis(input: string): { text: string; count: number } {
  if (!input || input.length === 0) return { text: '', count: 0 };
  
  try {
    const emojiPattern = /\p{Extended_Pictographic}/gu;
    let count = 0;
    let stripped = input.replace(emojiPattern, () => {
      count += 1;
      return '';
    });

    if (count === 0) {
      return { text: input, count: 0 };
    }

    stripped = stripped.replace(/[\u200d]|[\uFE0F]/g, '');
    return { text: stripped, count };
  } catch (error) {
    // Fallback if Unicode regex fails in some environments
    console.warn('stripEmojis failed:', error);
    return { text: input, count: 0 };
  }
}

function applyRedactions(input: string, options: CleanOptions, report: CleanReport): string {
  let text = input;

  const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<>()\u00A0]+/gi;
  const urlResult = replaceWithPlaceholder(text, urlPattern, '<URL>');
  if (urlResult.count > 0) {
    bump(report, 'structure', 'privacy:redact-url', urlResult.count);
    text = urlResult.text;
  }

  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emailResult = replaceWithPlaceholder(text, emailPattern, '<EMAIL>');
  if (emailResult.count > 0) {
    bump(report, 'structure', 'privacy:redact-email', emailResult.count);
    text = emailResult.text;
  }

  return text;
}

// =========================
// Parsing helpers
// =========================

function parseMarkdownLike(text: string): Block[] {
  return parseMarkdownLikeWithDepth(text, 0);
}

function parseMarkdownLikeWithDepth(text: string, depth: number): Block[] {
  if (!text || text.length === 0) return [];
  
  // Prevent stack overflow from recursive parsing
  const MAX_PARSE_DEPTH = 15;
  if (depth > MAX_PARSE_DEPTH) {
    console.warn('Max parse depth exceeded');
    return [{ type: 'paragraph', text: text.slice(0, 1000) + '...' }];
  }
  
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let index = 0;
  const maxIterations = lines.length * 2 + 200; // More generous safety buffer
  let iterations = 0;

  while (index < lines.length) {
    // Safety: prevent infinite loops
    if (++iterations > maxIterations) {
      console.warn(`parseMarkdownLike exceeded max iterations at line ${index}/${lines.length}, breaking`);
      // Add remaining content as a paragraph to avoid losing data
      const remaining = lines.slice(index).join('\n').trim();
      if (remaining) {
        blocks.push({ type: 'paragraph', text: remaining });
      }
      break;
    }
    
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = matchHeading(line);
    if (heading) {
      blocks.push(heading);
      index += 1;
      continue;
    }

    const fence = matchFence(line);
    if (fence) {
      const { content, nextIndex } = consumeFence(lines, index + 1, fence.delimiter);
      blocks.push({ type: 'code', content, fenced: true });
      index = nextIndex;
      continue;
    }

    const list = matchList(lines, index);
    if (list) {
      blocks.push(list.block);
      index = list.nextIndex;
      continue;
    }

    const footnote = matchFootnote(line);
    if (footnote) {
      blocks.push(footnote);
      index += 1;
      continue;
    }

    const blockquote = matchBlockquote(lines, index, depth);
    if (blockquote) {
      blocks.push(blockquote.block);
      index = blockquote.nextIndex;
      continue;
    }

    const table = matchTable(lines, index);
    if (table) {
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    const horizontalRule = matchHorizontalRule(line);
    if (horizontalRule) {
      blocks.push(horizontalRule);
      index += 1;
      continue;
    }

    const paragraph = consumeParagraph(lines, index);
    blocks.push({ type: 'paragraph', text: paragraph.block });
    index = paragraph.nextIndex;
  }

  return blocks;
}

function matchHeading(line: string): Extract<Block, { type: 'heading' }> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('#')) return null;
  const depth = trimmed.match(/^#+/)?.[0].length ?? 0;
  if (depth === 0 || depth > 6) return null;
  const text = trimmed.slice(depth).trim();
  return { type: 'heading', depth, text };
}

function matchFence(line: string): { delimiter: string } | null {
  const match = line.match(/^(```+|~~~+)/);
  if (!match) return null;
  return { delimiter: match[1] };
}

function consumeFence(
  lines: string[],
  start: number,
  delimiter: string
): { content: string; nextIndex: number } {
  const collected: string[] = [];
  let index = start;
  const maxLines = 1000; // Reasonable limit for code blocks

  while (index < lines.length && collected.length < maxLines) {
    const current = lines[index];
    // Check if this line closes the fence (must be same or longer delimiter)
    if (current.trim().startsWith(delimiter)) {
      return { content: collected.join('\n').trimEnd(), nextIndex: index + 1 };
    }
    collected.push(current);
    index += 1;
  }

  if (collected.length >= maxLines) {
    console.warn('Code fence exceeded max lines, treating as unclosed');
  }
  
  // Unclosed fence - treat collected content as code, continue parsing after
  console.warn('Unclosed code fence detected');
  return { content: collected.join('\n').trimEnd(), nextIndex: index };
}

function matchList(
  lines: string[],
  start: number
): { block: Extract<Block, { type: 'list' }>; nextIndex: number } | null {
  const items: string[] = [];
  let index = start;
  let ordered: boolean | null = null;

  while (index < lines.length) {
    const line = lines[index];
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    const orderedMatch = line.match(/^\s*(\d+)[.)]\s+(.*)$/);

    if (unorderedMatch) {
      if (ordered === null) ordered = false;
      if (ordered) break;
      items.push(unorderedMatch[1]);
      index += 1;
      continue;
    }

    if (orderedMatch) {
      if (ordered === null) ordered = true;
      if (ordered === false) break;
      items.push(orderedMatch[2]);
      index += 1;
      continue;
    }

    break;
  }

  if (items.length === 0) return null;
  return { block: { type: 'list', ordered: Boolean(ordered), items }, nextIndex: index };
}

function matchFootnote(line: string): Extract<Block, { type: 'footnote' }> | null {
  const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
  if (!match) return null;
  return { type: 'footnote', label: match[1], text: match[2] };
}

function matchBlockquote(
  lines: string[],
  start: number,
  depth = 0
): { block: Extract<Block, { type: 'blockquote' }>; nextIndex: number } | null {
  // Prevent stack overflow from deeply nested blockquotes
  const MAX_BLOCKQUOTE_DEPTH = 10;
  if (depth > MAX_BLOCKQUOTE_DEPTH) {
    console.warn('Max blockquote depth exceeded');
    return null;
  }
  
  const collected: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (!/^\s*>/.test(line)) break;
    const stripped = line.replace(/^\s*>\s?/, '');
    collected.push(stripped);
    index += 1;
  }

  if (collected.length === 0) return null;
  const nestedBlocks = parseMarkdownLikeWithDepth(collected.join('\n'), depth + 1);
  return { block: { type: 'blockquote', blocks: nestedBlocks }, nextIndex: index };
}

function matchTable(
  lines: string[],
  start: number
): { block: Extract<Block, { type: 'table' }>; nextIndex: number } | null {
  if (!lines[start].includes('|')) return null;
  const collected: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.includes('|')) break;
    collected.push(line);
    index += 1;
  }

  if (collected.length === 0) return null;
  return { block: { type: 'table', rows: collected }, nextIndex: index };
}

function matchHorizontalRule(line: string): Extract<Block, { type: 'rule' }> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.includes('|')) return null;

  const normalized = trimmed.replace(/\s+/g, '');
  if (!/^(-{3,}|_{3,}|\*{3,})$/.test(normalized)) return null;

  const marker = normalized[0] === '*' ? '***' : normalized[0] === '_' ? '___' : '---';

  return { type: 'rule', marker };
}

function consumeParagraph(lines: string[], start: number): { block: string; nextIndex: number } {
  const collected: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) break;
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) break;
    if (/^\s*>/.test(line)) break;
    if (/^\s*(```+|~~~+)/.test(line)) break;
    if (matchHorizontalRule(line)) break;
    collected.push(line);
    index += 1;
  }

  return { block: collected.join(' ').trim(), nextIndex: index };
}

function looksLikeHtml(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes('<') || !lower.includes('>')) return false;
  if (/^<!doctype|<html|<body|<div|<p|<span|<section|<article|<ul|<ol|<li/.test(lower)) return true;
  return /<\w+[\s>]/.test(lower);
}

function looksLikeMarkdown(text: string): boolean {
  if (/^\s*#/.test(text)) return true;
  if (/^\s*[-*+]\s+/m.test(text)) return true;
  if (/^\s*\d+[.)]\s+/m.test(text)) return true;
  if (/```/.test(text)) return true;
  if (/\[.+\]\(.+\)/.test(text)) return true;
  return false;
}

// =========================
// HTML handling
// =========================

function sanitizeHtml(input: string, runtime: CleanerRuntimeOptions): string {
  if (runtime.sanitizeHtml) {
    try {
      return runtime.sanitizeHtml(input);
    } catch {
      // fall through to internal fallback
    }
  }
  return fallbackSanitizeHtml(input);
}

function fallbackSanitizeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/ on[a-z]+="[^"]*"/gi, '')
    .replace(/ on[a-z]+='[^']*'/gi, '');
}

function htmlToText(input: string): string {
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/html');
      return walkDom(doc.body ?? doc.documentElement ?? doc, []);
    } catch {
      // ignore and fallback
    }
  }
  return stripTags(input);
}

function walkDom(node: Node, lines: string[], depth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? '';
    if (value.trim()) {
      lines.push(value);
    }
    return lines.join('');
  }

  if (!(node instanceof Element)) {
    node.childNodes.forEach((child) => walkDom(child, lines, depth + 1));
    return lines.join('');
  }

  const blockTags = new Set([
    'P',
    'DIV',
    'SECTION',
    'ARTICLE',
    'LI',
    'BR',
    'HR',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'TR',
  ]);
  if (blockTags.has(node.tagName)) {
    lines.push('\n');
  }

  node.childNodes.forEach((child) => walkDom(child, lines, depth + 1));

  if (node.tagName === 'LI') {
    lines.push('\n');
  }

  return lines.join('');
}

function stripTags(input: string): string {
  return input
    .replace(/<\/?(p|div|br|li|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, '\n');
}

// =========================
// Utility helpers
// =========================

function stripAnsi(text: string): { text: string; count: number } {
  // eslint-disable-next-line no-control-regex -- ANSI escape sequences are intentional
  const regex = /\u001B\[[0-9;]*[A-Za-z]/g;
  let count = 0;
  const replaced = text.replace(regex, () => {
    count += 1;
    return '';
  });
  return { text: replaced, count };
}

function decodeEntities(text: string): { text: string; count: number; changed: boolean } {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': '\u00A0',
  };
  let count = 0;
  let result = text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => {
    count += 1;
    return map[match];
  });

  result = result.replace(/&#(x?[0-9a-fA-F]+);/g, (_match, code) => {
    count += 1;
    const isHex = code.startsWith('x') || code.startsWith('X');
    const value = isHex ? parseInt(code.slice(1), 16) : parseInt(code, 10);
    if (Number.isNaN(value)) return '';
    return String.fromCodePoint(value);
  });

  return { text: result, count, changed: count > 0 };
}

function normalizeToNfc(text: string): { text: string; count: number; changed: boolean } {
  if (!text) return { text, count: 0, changed: false };
  const normalised = text.normalize('NFC');
  if (normalised === text) return { text, count: 0, changed: false };
  return { text: normalised, count: Math.abs(normalised.length - text.length) || 1, changed: true };
}

function stripFormatCharacters(text: string): { text: string; count: number } {
  const urlRanges: Array<{ start: number; end: number }> = [];
  const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    urlRanges.push({ start: urlMatch.index, end: urlMatch.index + urlMatch[0].length });
  }

  const toRemove = new Set<number>();
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (!isFormatCharacter(code)) continue;
    const insideUrl = urlRanges.some((range) => i >= range.start && i < range.end);
    if (!insideUrl) {
      toRemove.add(i);
    }
  }

  if (toRemove.size === 0) {
    return { text, count: 0 };
  }

  let result = '';
  for (let i = 0; i < text.length; i += 1) {
    if (toRemove.has(i)) continue;
    result += text[i];
  }

  return { text: result, count: toRemove.size };
}

function isFormatCharacter(codePoint: number): boolean {
  return (
    (codePoint >= 0x200b && codePoint <= 0x200f) ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2060 && codePoint <= 0x2064) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069) ||
    codePoint === 0x00ad ||
    codePoint === 0xfeff
  );
}

function normalizeNbsp(text: string): { text: string; count: number } {
  let count = 0;
  const replaced = text.replace(/\u00A0/g, () => {
    count += 1;
    return ' ';
  });
  return { text: replaced, count };
}

function replaceEmDashWithComma(text: string): { text: string; count: number } {
  let count = 0;
  // Replace em-dash with comma, preserving surrounding spaces
  let result = text.replace(/ *— */g, (match) => {
    count += 1;
    // Always add space after comma for readability
    return ', ';
  });

  // Clean up any spacing issues
  result = result.replace(/\s+,/g, ',');         // Remove space before comma
  result = result.replace(/,([^ ])/g, ', $1');   // Ensure space after comma
  result = result.replace(/,\s{2,}/g, ', ');     // Collapse multiple spaces after comma
  // Avoid double punctuation
  result = result.replace(/, ([.!?;:,)\]])/g, '$1');
  result = result.replace(/, $/, '');
  return { text: result, count };
}

function replaceWithCounter(
  text: string,
  pattern: RegExp,
  replacement: string
): { text: string; count: number } {
  let count = 0;
  const replaced = text.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  return { text: replaced, count };
}

function replaceWithPlaceholder(
  text: string,
  pattern: RegExp,
  placeholder: string
): { text: string; count: number } {
  let count = 0;
  const replaced = text.replace(pattern, () => {
    count += 1;
    return placeholder;
  });
  return { text: replaced, count };
}

function segmentSentences(text: string, locale: string): string[] {
  const SegmenterCtor = typeof Intl !== 'undefined' ? (Intl as any).Segmenter : undefined;
  if (typeof SegmenterCtor === 'function') {
    try {
      const segmenter = new SegmenterCtor(locale, { granularity: 'sentence' });
      const segments: string[] = [];
      const iterator = segmenter.segment(text);
      for (const segment of iterator) {
        if (segment.segment.trim()) segments.push(segment.segment.trim());
      }
      if (segments.length > 0) return segments;
    } catch {
      // ignore and fall back
    }
  }
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function mergeOptions(
  base: CleanOptions,
  preset: Partial<CleanOptions>,
  overrides: Partial<CleanOptions>
): CleanOptions {
  return {
    preset: overrides.preset ?? preset.preset ?? base.preset,
    locale: overrides.locale ?? preset.locale ?? base.locale,
    linkMode: overrides.linkMode ?? preset.linkMode ?? base.linkMode,
    listMode: overrides.listMode ?? preset.listMode ?? base.listMode,
    inlineCode: overrides.inlineCode ?? preset.inlineCode ?? base.inlineCode,
    blockCode: overrides.blockCode ?? preset.blockCode ?? base.blockCode,
    redactContacts: overrides.redactContacts ?? preset.redactContacts ?? base.redactContacts,
    punctuation: {
      mapEmDash:
        overrides.punctuation?.mapEmDash ??
        preset.punctuation?.mapEmDash ??
        base.punctuation.mapEmDash,
      mapEnDash:
        overrides.punctuation?.mapEnDash ??
        preset.punctuation?.mapEnDash ??
        base.punctuation.mapEnDash,
      curlyQuotes:
        overrides.punctuation?.curlyQuotes ??
        preset.punctuation?.curlyQuotes ??
        base.punctuation.curlyQuotes,
      ellipsis:
        overrides.punctuation?.ellipsis ??
        preset.punctuation?.ellipsis ??
        base.punctuation.ellipsis,
    },
    structure: {
      dropHeadings:
        overrides.structure?.dropHeadings ??
        preset.structure?.dropHeadings ??
        base.structure.dropHeadings,
      dropTables:
        overrides.structure?.dropTables ??
        preset.structure?.dropTables ??
        base.structure.dropTables,
      dropFootnotes:
        overrides.structure?.dropFootnotes ??
        preset.structure?.dropFootnotes ??
        base.structure.dropFootnotes,
      dropBlockquotes:
        overrides.structure?.dropBlockquotes ??
        preset.structure?.dropBlockquotes ??
        base.structure.dropBlockquotes,
      dropHorizontalRules:
        overrides.structure?.dropHorizontalRules ??
        preset.structure?.dropHorizontalRules ??
        base.structure.dropHorizontalRules,
      stripEmojis:
        overrides.structure?.stripEmojis ??
        preset.structure?.stripEmojis ??
        base.structure.stripEmojis,
      keepBasicMarkdown:
        overrides.structure?.keepBasicMarkdown ??
        preset.structure?.keepBasicMarkdown ??
        base.structure.keepBasicMarkdown,
    },
    whitespace: {
      collapseSpaces:
        overrides.whitespace?.collapseSpaces ??
        preset.whitespace?.collapseSpaces ??
        base.whitespace.collapseSpaces,
      collapseBlankLines:
        overrides.whitespace?.collapseBlankLines ??
        preset.whitespace?.collapseBlankLines ??
        base.whitespace.collapseBlankLines,
      trim: overrides.whitespace?.trim ?? preset.whitespace?.trim ?? base.whitespace.trim,
      normalizeNbsp:
        overrides.whitespace?.normalizeNbsp ??
        preset.whitespace?.normalizeNbsp ??
        base.whitespace.normalizeNbsp,
      ensureFinalNewline:
        overrides.whitespace?.ensureFinalNewline ??
        preset.whitespace?.ensureFinalNewline ??
        base.whitespace.ensureFinalNewline,
    },
  } satisfies CleanOptions;
}

function createEmptyReport(): CleanReport {
  const ruleCounts: Record<RuleId, number> = {
    'pre:strip-ansi': 0,
    'pre:decode-entities': 0,
    'pre:normalize-nfc': 0,
    'pre:strip-format-chars': 0,
    'parse:sanitize-html': 0,
    'parse:html-to-text': 0,
    'structure:heading-drop': 0,
    'structure:heading-inline-strip': 0,
    'structure:list-render': 0,
    'structure:link-render': 0,
    'structure:inline-code': 0,
    'structure:block-code': 0,
    'structure:horizontal-rule': 0,
    'structure:horizontal-rule-inline-strip': 0,
    'structure:table-drop': 0,
    'structure:footnote-drop': 0,
    'structure:blockquote-normalize': 0,
    'structure:inline-markup': 0,
    'structure:emoji-strip': 0,
    'privacy:redact-url': 0,
    'privacy:redact-email': 0,
    'punct:emdash': 0,
    'punct:endash': 0,
    'punct:quotes': 0,
    'punct:ellipsis': 0,
    'whitespace:nbsp': 0,
    'whitespace:inline': 0,
    'whitespace:blank-lines': 0,
    'whitespace:trim': 0,
    'whitespace:final-newline': 0,
    'fallback:strip-markdown': 0,
  };

  const stageCounts: Record<StageId, number> = {
    preprocess: 0,
    structure: 0,
    punctuation: 0,
    whitespace: 0,
    fallback: 0,
  };

  return { ruleCounts, stageCounts, changes: 0 };
}

function bump(report: CleanReport, stage: StageId, rule: RuleId, amount: number): void {
  if (amount <= 0) return;
  report.ruleCounts[rule] += amount;
  report.stageCounts[stage] += amount;
  report.changes += amount;
}

function fallbackStripMarkdown(input: string, report: CleanReport): string {
  const stripped = input
    .replace(/`{3}[\s\S]*?`{3}/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_~]{1,3}([^*_~\n]+)[*_~]{1,3}/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*([-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(?:[-*_]){3,}/g, '');
  if (stripped !== input) {
    bump(report, 'fallback', 'fallback:strip-markdown', 1);
  }
  return stripped;
}

// =========================
// Misc utilities
// =========================

function performanceNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  const [seconds, nanoseconds] =
    typeof process !== 'undefined' && typeof process.hrtime === 'function'
      ? process.hrtime()
      : [Date.now() / 1000, 0];
  return seconds * 1000 + nanoseconds / 1e6;
}

// Ensure fallback by re-running whitespace + punctuation on fallback results
(function ensureFallbackIdempotence() {
  // No-op placeholder helps bundlers retain helper functions even when tree-shaken.
})();
