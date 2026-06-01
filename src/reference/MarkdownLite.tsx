// Renderer for reference-card markdown-lite (WP-B).
//
// Turns the parsed block model (parseMarkdownLite) into React elements using JSX
// children ONLY — text always lands as DOM text nodes, so authored card content
// can never inject markup. No raw-HTML escape hatch is used anywhere here.

import { Fragment } from 'react';
import {
  type InlineSpan,
  type MarkdownBlock,
  parseMarkdownLite,
} from './markdownLite.ts';
import styles from './MarkdownLite.module.css';

function Inline({ spans }: { spans: readonly InlineSpan[] }) {
  return (
    <>
      {spans.map((span, idx) =>
        span.bold ? (
          // Keys are positional: spans are derived from immutable card text and
          // never reordered, so the index is a stable identity here.
          <strong key={idx}>{span.text}</strong>
        ) : (
          <Fragment key={idx}>{span.text}</Fragment>
        ),
      )}
    </>
  );
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className={styles.paragraph}>
          <Inline spans={block.spans} />
        </p>
      );
    case 'callout':
      return (
        <p className={styles.callout} role="note">
          <Inline spans={block.spans} />
        </p>
      );
    case 'list':
      return (
        <ul className={styles.list}>
          {block.items.map((item, idx) => (
            <li key={idx} className={styles.listItem}>
              <Inline spans={item} />
            </li>
          ))}
        </ul>
      );
  }
}

/** Render a reference-card `body` (markdown-lite) into safe React elements. */
export default function MarkdownLite({ body }: { body: string }) {
  const blocks = parseMarkdownLite(body);
  return (
    <div className={styles.root}>
      {blocks.map((block, idx) => (
        <Block key={idx} block={block} />
      ))}
    </div>
  );
}
