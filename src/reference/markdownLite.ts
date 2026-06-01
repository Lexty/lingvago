// Markdown-lite parser for reference-card bodies (WP-B).
//
// The authored reference cards (scripts/build-content.ts) store `body` as a tiny
// markdown dialect — NOT full Markdown. We deliberately ship an in-house parser
// (no markdown npm dependency: offline bundle weight / YAGNI) that understands
// exactly the four constructs the authored content uses:
//
//   • **bold**     → strong spans (inline)
//   • `•` bullets  → a line beginning with "• " is a list item
//   • `⚠️` lines   → a line beginning with "⚠️" is a callout (warning) block
//   • newlines     → blank line separates blocks; single newline ends a block
//
// The output is a plain data model (blocks → inline spans). The React renderer
// turns it into elements via JSX children only (never raw-HTML injection), so
// card text is rendered as DOM text nodes and can never inject markup.

/** A single inline span: plain text or a bold run. */
export interface InlineSpan {
  bold: boolean;
  text: string;
}

/** A paragraph of inline spans. */
export interface ParagraphBlock {
  type: 'paragraph';
  spans: InlineSpan[];
}

/** A `⚠️` callout line (rendered with a warning affordance), inline-parsed. */
export interface CalloutBlock {
  type: 'callout';
  spans: InlineSpan[];
}

/** A bullet list — each item is a run of inline spans. */
export interface ListBlock {
  type: 'list';
  items: InlineSpan[][];
}

export type MarkdownBlock = ParagraphBlock | CalloutBlock | ListBlock;

const BULLET = '•';
const WARNING = '⚠️';

/**
 * Parse inline `**bold**` runs in a single line into spans.
 *
 * `**` toggles bold. An UNterminated `**` (odd count) is treated as literal text
 * for the trailing run, so malformed input still renders all its characters
 * (never throws, never drops text).
 */
export function parseInline(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const parts = line.split('**');
  // Even index → outside bold, odd index → inside bold. A trailing unmatched
  // `**` leaves the final (odd-count) segment; we merge it back as plain text.
  const lastBoldIsOpen = parts.length % 2 === 0;
  parts.forEach((part, idx) => {
    if (part.length === 0) return;
    const isLast = idx === parts.length - 1;
    const bold = idx % 2 === 1 && !(isLast && lastBoldIsOpen);
    spans.push({ bold, text: part });
  });
  return spans;
}

/**
 * Parse a reference-card `body` (markdown-lite) into a list of blocks.
 *
 * Lines are grouped: consecutive `• ` lines coalesce into one list; each `⚠️`
 * line is its own callout; everything else is a paragraph. Blank lines separate
 * paragraphs but never split a contiguous list/callout run incorrectly. Always
 * returns a (possibly empty) array — never throws.
 */
export function parseMarkdownLite(body: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = body.split('\n');
  let listItems: InlineSpan[][] | null = null;
  let paragraphLines: string[] | null = null;

  const flushList = (): void => {
    if (listItems && listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
    }
    listItems = null;
  };
  const flushParagraph = (): void => {
    if (paragraphLines && paragraphLines.length > 0) {
      // Join wrapped paragraph lines with a space so spans stay inline.
      blocks.push({ type: 'paragraph', spans: parseInline(paragraphLines.join(' ')) });
    }
    paragraphLines = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.length === 0) {
      flushList();
      flushParagraph();
      continue;
    }
    if (line.startsWith(`${BULLET} `) || line === BULLET) {
      flushParagraph();
      const itemText = line.slice(BULLET.length).trimStart();
      listItems ??= [];
      listItems.push(parseInline(itemText));
      continue;
    }
    if (line.startsWith(WARNING)) {
      flushList();
      flushParagraph();
      blocks.push({ type: 'callout', spans: parseInline(line) });
      continue;
    }
    // Plain text line → accumulate into the current paragraph.
    flushList();
    paragraphLines ??= [];
    paragraphLines.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}
