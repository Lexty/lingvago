import { describe, expect, it } from 'vitest';
import en from './en.json';
import ru from './ru.json';

/** Recursively collect dotted leaf-key paths from a nested locale object. */
function collectKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') {
    return [prefix];
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

/** Resolve a dotted leaf path against a nested locale object. */
function getNestedValue(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc !== null && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

describe('locale key parity (ru.json == en.json)', () => {
  it('has identical leaf-key sets in ru and en', () => {
    const ruKeys = collectKeys(ru).sort();
    const enKeys = collectKeys(en).sort();
    expect(ruKeys).toEqual(enKeys);
  });

  it('has only non-empty string leaf values', () => {
    for (const [name, bundle] of [
      ['ru', ru],
      ['en', en],
    ] as const) {
      const leaves = collectKeys(bundle);
      expect(leaves.length, `${name} has keys`).toBeGreaterThan(0);
      for (const path of leaves) {
        const value = getNestedValue(bundle, path);
        expect(typeof value, `${name}.${path} is a string`).toBe('string');
        expect((value as string).trim().length, `${name}.${path} is non-empty`).toBeGreaterThan(0);
      }
    }
  });
});
