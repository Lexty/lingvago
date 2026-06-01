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
});
