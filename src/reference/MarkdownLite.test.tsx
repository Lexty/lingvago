import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownLite from './MarkdownLite.tsx';

describe('MarkdownLite renderer — tables', () => {
  it('emits a semantic <table> with header + body cells as text nodes (incl. bold)', () => {
    const body = [
      '| Pessoa | Form |',
      '| --- | --- |',
      '| **nós** | nosso |',
      '| vocês | vosso |',
    ].join('\n');
    const { container } = render(<MarkdownLite body={body} />);

    const table = container.querySelector('table');
    expect(table).not.toBeNull();

    // Header cells are <th> with the authored text as DOM text nodes.
    const headers = Array.from(table!.querySelectorAll('thead th')).map((th) => th.textContent);
    expect(headers).toEqual(['Pessoa', 'Form']);

    // Body cells are <td>; a bold cell renders a <strong> whose text is correct.
    const firstRowCells = Array.from(table!.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent),
    );
    expect(firstRowCells).toEqual([
      ['nós', 'nosso'],
      ['vocês', 'vosso'],
    ]);
    const strong = table!.querySelector('tbody strong');
    expect(strong?.textContent).toBe('nós');
  });

  it('renders a ref-possessive-style body as a table with no raw pipe characters', () => {
    // Mirrors the shipped `ref-possessive` body shape (intro paragraph, then a
    // pipe-table, then a trailing paragraph + rules) built in build-content.ts.
    const body = [
      '**Possessive determiners** — agree with the POSSESSED noun (gender + number):',
      '',
      '| Pessoa | m. sg. | m. pl. | f. sg. | f. pl. |',
      '| --- | --- | --- | --- | --- |',
      '| eu | meu | meus | minha | minhas |',
      '| vocês | vosso | vossos | vossa | vossas |',
      '',
      '**3rd person (after the noun, invariable):** dele · dela',
    ].join('\n');
    const { container } = render(<MarkdownLite body={body} />);

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    // The header row is real <th>, not mashed pipe text in a paragraph.
    expect(table!.querySelectorAll('thead th')).toHaveLength(5);
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(2);
    // No raw `|` leaked into any rendered text node anywhere in the output.
    expect(container.textContent).not.toContain('|');
  });

  it('renders a ref-interrogative-style body as a table (no raw pipes)', () => {
    const body = [
      '**Interrogativos** — EP question words (the blank replaces the interrogative):',
      '',
      '| Form | Meaning | RU | Agreement |',
      '| --- | --- | --- | --- |',
      '| quem | who | кто | — |',
      '| quanto | how much | сколько | gender number |',
    ].join('\n');
    const { container } = render(<MarkdownLite body={body} />);

    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.textContent).not.toContain('|');
  });

  it('does not throw and keeps text for a malformed/ragged table', () => {
    const body = ['| a | b | c |', '| --- | --- | --- |', '| 1 |', '| x | y | z | w |'].join('\n');
    expect(() => render(<MarkdownLite body={body} />)).not.toThrow();
    const { container } = render(<MarkdownLite body={body} />);
    const text = container.textContent ?? '';
    for (const token of ['a', 'b', 'c', '1', 'x', 'y', 'z', 'w']) {
      expect(text).toContain(token);
    }
  });
});
