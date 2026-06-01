import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bundleFile,
  bundleFilename,
  canShareFile,
  shareOrDownloadBundle,
} from './share.ts';

/** A Navigator-shaped stub carrying only the share surface we feature-detect. */
function navStub(over: Partial<Navigator> = {}): Navigator {
  return over as Navigator;
}

const SAMPLE = '{"schemaVersion":1}';
const EXPORTED_AT = '2026-05-31T12:34:56.000Z';

/**
 * Stub the object-URL lifecycle for the download path. jsdom does not implement
 * `URL.createObjectURL` / `revokeObjectURL`, so we install no-op stubs (restored
 * in afterEach) — every real browser + the e2e Chromium has them natively.
 */
function stubObjectUrl(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => 'blob:fake',
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: () => {},
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (URL as Partial<typeof URL>).createObjectURL;
  delete (URL as Partial<typeof URL>).revokeObjectURL;
});

describe('bundleFilename', () => {
  it('stamps the export time into a filesystem-safe name', () => {
    expect(bundleFilename(EXPORTED_AT)).toBe(
      'lingvago2-progress-2026-05-31T12-34-56Z.json',
    );
  });
});

describe('canShareFile (feature-detect)', () => {
  const file = bundleFile(SAMPLE, EXPORTED_AT);

  it('is false when navigator has no share API', () => {
    expect(canShareFile(file, navStub())).toBe(false);
  });

  it('is false when canShare rejects the files payload', () => {
    const nav = navStub({
      share: vi.fn(),
      canShare: vi.fn().mockReturnValue(false),
    });
    expect(canShareFile(file, nav)).toBe(false);
  });

  it('is true when both share and canShare accept files', () => {
    const nav = navStub({
      share: vi.fn(),
      canShare: vi.fn().mockReturnValue(true),
    });
    expect(canShareFile(file, nav)).toBe(true);
  });

  it('is false (never throws) when canShare itself throws', () => {
    const nav = navStub({
      share: vi.fn(),
      canShare: vi.fn(() => {
        throw new Error('boom');
      }),
    });
    expect(canShareFile(file, nav)).toBe(false);
  });
});

describe('shareOrDownloadBundle', () => {
  it('shares via navigator.share when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const nav = navStub({ share, canShare: vi.fn().mockReturnValue(true) });

    const outcome = await shareOrDownloadBundle(SAMPLE, EXPORTED_AT, nav);

    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0][0] as ShareData;
    expect(arg.files?.[0].name).toBe('lingvago2-progress-2026-05-31T12-34-56Z.json');
  });

  it('falls back to a download when share is unavailable', async () => {
    stubObjectUrl();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const outcome = await shareOrDownloadBundle(SAMPLE, EXPORTED_AT, navStub());

    expect(outcome).toBe('downloaded');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('propagates a user AbortError instead of double-exporting', async () => {
    const abort = new DOMException('cancelled', 'AbortError');
    const share = vi.fn().mockRejectedValue(abort);
    const nav = navStub({ share, canShare: vi.fn().mockReturnValue(true) });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    await expect(shareOrDownloadBundle(SAMPLE, EXPORTED_AT, nav)).rejects.toBe(abort);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('falls back to download when share fails for a NON-abort reason', async () => {
    stubObjectUrl();
    const share = vi.fn().mockRejectedValue(new Error('share target gone'));
    const nav = navStub({ share, canShare: vi.fn().mockReturnValue(true) });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const outcome = await shareOrDownloadBundle(SAMPLE, EXPORTED_AT, nav);

    expect(outcome).toBe('downloaded');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
