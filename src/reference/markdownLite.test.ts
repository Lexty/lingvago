import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdownLite } from './markdownLite.ts';

describe('parseInline', () => {
  it('splits **bold** runs from plain text', () => {
    expect(parseInline('a **b** c')).toEqual([
      { bold: false, text: 'a ' },
      { bold: true, text: 'b' },
      { bold: false, text: ' c' },
    ]);
  });

  it('treats an unterminated ** as literal text (never drops it)', () => {
    // Odd number of `**` → the trailing run is plain text, not an open bold.
    expect(parseInline('x **y')).toEqual([
      { bold: false, text: 'x ' },
      { bold: false, text: 'y' },
    ]);
  });

  it('returns no spans for an empty line', () => {
    expect(parseInline('')).toEqual([]);
  });
});

describe('parseMarkdownLite', () => {
  it('groups consecutive bullet lines into one list', () => {
    const blocks = parseMarkdownLite('• one\n• two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'list' });
    if (blocks[0].type === 'list') {
      expect(blocks[0].items).toHaveLength(2);
      expect(blocks[0].items[0]).toEqual([{ bold: false, text: 'one' }]);
    }
  });

  it('parses a ⚠️ line as a callout block', () => {
    const blocks = parseMarkdownLite('⚠️ careful');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('callout');
  });

  it('separates paragraphs on a blank line and keeps inline bold', () => {
    const blocks = parseMarkdownLite('**SER** is one\n\nplain two');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'paragraph']);
    if (blocks[0].type === 'paragraph') {
      expect(blocks[0].spans[0]).toEqual({ bold: true, text: 'SER' });
    }
  });

  it('handles a mixed paragraph + list + callout body', () => {
    const body = ['intro', '', '• a', '• b', '', '⚠️ note'].join('\n');
    const blocks = parseMarkdownLite(body);
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list', 'callout']);
  });

  it('returns an empty array for an empty body (no crash)', () => {
    expect(parseMarkdownLite('')).toEqual([]);
  });

  it('parses a pipe-table into a table block with header + rows + a bold cell', () => {
    const body = [
      '| Pessoa | Form |',
      '| --- | --- |',
      '| **nós** | nosso |',
      '| vocês | vosso |',
    ].join('\n');
    const blocks = parseMarkdownLite(body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    if (blocks[0].type === 'table') {
      // The separator row is dropped and promotes the first row to the header.
      expect(blocks[0].header).toEqual([
        [{ bold: false, text: 'Pessoa' }],
        [{ bold: false, text: 'Form' }],
      ]);
      expect(blocks[0].rows).toHaveLength(2);
      // Leading/trailing `|` edge cells are dropped (2 cells per row, not 4).
      expect(blocks[0].rows[0]).toEqual([
        [{ bold: true, text: 'nós' }],
        [{ bold: false, text: 'nosso' }],
      ]);
      expect(blocks[0].rows[1][0]).toEqual([{ bold: false, text: 'vocês' }]);
    }
  });

  it('flushes a paragraph before a table starts and a paragraph after it ends', () => {
    const body = ['intro', '| a | b |', '| --- | --- |', '| 1 | 2 |', 'outro'].join('\n');
    const blocks = parseMarkdownLite(body);
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('degrades a separator-less single pipe line to a one-row table (no throw, no text loss)', () => {
    const blocks = parseMarkdownLite('| just | one | row |');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    if (blocks[0].type === 'table') {
      // No separator → no header; the row is preserved in full.
      expect(blocks[0].header).toBeNull();
      expect(blocks[0].rows).toHaveLength(1);
      expect(blocks[0].rows[0]).toEqual([
        [{ bold: false, text: 'just' }],
        [{ bold: false, text: 'one' }],
        [{ bold: false, text: 'row' }],
      ]);
    }
  });

  it('preserves a separator-only run as a row (never drops the authored text)', () => {
    // A run that is nothing but a `|---|` separator must NOT silently vanish:
    // the table degrades to a one-row table holding the raw separator cells.
    let blocks: ReturnType<typeof parseMarkdownLite> = [];
    expect(() => {
      blocks = parseMarkdownLite('| --- | --- |');
    }).not.toThrow();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    if (blocks[0].type === 'table') {
      // No header was promotable (no preceding row); the text survives as a body row.
      expect(blocks[0].header).toBeNull();
      expect(blocks[0].rows).toHaveLength(1);
      // The separator's authored cells are preserved verbatim (not an empty table).
      expect(blocks[0].rows[0]).toEqual([
        [{ bold: false, text: '---' }],
        [{ bold: false, text: '---' }],
      ]);
    }
  });

  it('keeps the header when a separator follows it with no body rows (no text loss)', () => {
    // A header row followed by a trailing/duplicate separator and nothing else:
    // the header text must survive even though there are zero body rows.
    let blocks: ReturnType<typeof parseMarkdownLite> = [];
    expect(() => {
      blocks = parseMarkdownLite(['| Pessoa | Form |', '| --- | --- |', '| --- | --- |'].join('\n'));
    }).not.toThrow();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    if (blocks[0].type === 'table') {
      // First separator promotes the header; the duplicate separator is dropped.
      expect(blocks[0].header).toEqual([
        [{ bold: false, text: 'Pessoa' }],
        [{ bold: false, text: 'Form' }],
      ]);
      // The authored header text is NOT lost even though no body row remains.
      expect(blocks[0].rows).toEqual([]);
    }
  });

  it('degrades a ragged table without throwing and without dropping any cell', () => {
    const body = [
      '| a | b | c |',
      '| --- | --- | --- |',
      '| 1 |', // ragged: fewer columns than the header
      '| x | y | z | w |', // ragged: more columns than the header
    ].join('\n');
    let blocks: ReturnType<typeof parseMarkdownLite> = [];
    expect(() => {
      blocks = parseMarkdownLite(body);
    }).not.toThrow();
    expect(blocks[0].type).toBe('table');
    if (blocks[0].type === 'table') {
      expect(blocks[0].header).toHaveLength(3);
      expect(blocks[0].rows[0]).toHaveLength(1); // all of the short row kept
      expect(blocks[0].rows[1]).toHaveLength(4); // all of the long row kept
    }
  });
});
