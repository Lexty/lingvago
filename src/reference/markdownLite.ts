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
//   • `| … |` rows → a run of consecutive pipe lines is one table; a `|---|`
//                    separator row marks the preceding row as the header
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

/** A single table cell: a run of inline spans. */
export type TableCell = InlineSpan[];

/**
 * A pipe-table. `header` is the (optional) header row — present only when a
 * `|---|` separator row followed the first row; otherwise the table is all body
 * rows (graceful fallback for tables authored without a separator).
 */
export interface TableBlock {
  type: 'table';
  header: TableCell[] | null;
  rows: TableCell[][];
}

export type MarkdownBlock = ParagraphBlock | CalloutBlock | ListBlock | TableBlock;

const BULLET = '•';
const WARNING = '⚠️';

/** A line is a table row if it starts with `|` and contains another `|`. */
function isTableLine(line: string): boolean {
  return line.startsWith('|') && line.indexOf('|', 1) !== -1;
}

/** A `|---|`-style separator: only `|`, `-`, `:` and spaces (and at least one `-`). */
function isSeparatorLine(line: string): boolean {
  return /-/.test(line) && /^[|\-:\s]+$/.test(line);
}

/**
 * Split one `| a | b |` row into trimmed cell strings, dropping the empty edge
 * cells produced by the leading/trailing `|`. A row with no `|` yields one cell.
 */
function splitRowCells(line: string): string[] {
  const cells = line.split('|').map((c) => c.trim());
  if (cells.length > 0 && cells[0] === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/**
 * Build a `TableBlock` from a run of consecutive pipe lines. A separator row
 * (`|---|`) is dropped and marks the PRECEDING row as the header. Never throws
 * and never drops text: ragged rows keep all their cells, and a run that is
 * nothing but separators degrades to a single-row table of the raw lines.
 */
function buildTable(tableLines: string[]): TableBlock {
  let header: TableCell[] | null = null;
  const rows: TableCell[][] = [];
  for (const line of tableLines) {
    if (isSeparatorLine(line)) {
      // Promote the immediately-preceding row to the header (once).
      if (header === null && rows.length > 0) {
        header = rows.pop() ?? null;
      }
      continue;
    }
    rows.push(splitRowCells(line).map((cell) => parseInline(cell)));
  }
  // Degenerate run: every line was a separator, so the header promotion above
  // never fired and no body row was emitted — the authored text would be lost.
  // Preserve it (never-drops-text invariant) by keeping the raw separator lines
  // as body rows. The well-formed path (header and/or body present) is untouched.
  if (header === null && rows.length === 0) {
    for (const line of tableLines) {
      rows.push(splitRowCells(line).map((cell) => parseInline(cell)));
    }
  }
  return { type: 'table', header, rows };
}

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
  let tableLines: string[] | null = null;

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
  const flushTable = (): void => {
    if (tableLines && tableLines.length > 0) {
      blocks.push(buildTable(tableLines));
    }
    tableLines = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.length === 0) {
      flushList();
      flushParagraph();
      flushTable();
      continue;
    }
    if (isTableLine(line)) {
      // A run of consecutive pipe lines forms ONE table — flush the other
      // pending blocks first (same flush model as list/callout below).
      flushList();
      flushParagraph();
      tableLines ??= [];
      tableLines.push(line);
      continue;
    }
    // A non-pipe line ends any open table run.
    flushTable();
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
  flushTable();
  return blocks;
}
