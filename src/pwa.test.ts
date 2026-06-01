import { afterEach, describe, expect, it } from 'vitest';
import { registerPwa } from './pwa.ts';

/**
 * registerPwa() must no-op outside a service-worker-capable browser (SPEC §10.2
 * guard at pwa.ts L12-14). Under jsdom `navigator` has no `serviceWorker`, so
 * the early return is exercised here: the function returns synchronously and
 * never reaches the dynamic `virtual:pwa-register` import (which is unresolvable
 * in the unit-test environment and would otherwise throw/reject).
 */
describe('registerPwa — non-SW environment guard (§10.2)', () => {
  afterEach(() => {
    // Drop any serviceWorker stub a test added so others see the jsdom default.
    if ('serviceWorker' in navigator) {
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    }
  });

  it('jsdom navigator has no serviceWorker (precondition for the guard)', () => {
    expect('serviceWorker' in navigator).toBe(false);
  });

  it('returns undefined and does not throw when serviceWorker is unavailable', () => {
    let result: unknown;
    expect(() => {
      result = registerPwa();
    }).not.toThrow();
    expect(result).toBeUndefined();
  });

  it('still no-ops on repeated calls (idempotent guard, no side effects)', () => {
    expect(() => {
      registerPwa();
      registerPwa();
    }).not.toThrow();
  });
});
