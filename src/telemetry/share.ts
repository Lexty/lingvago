// UI-facing share/download helper for the progress bundle (SPEC §13.3, AC5).
//
// This is a THIN wrapper over the platform share/download APIs — the pure
// bundle build + serialization stay in `bundle.ts` (Task 1). The Export button
// builds the bundle JSON there, then hands it here to either:
//  - Web Share API (`navigator.share({ files: [...] })`) when AVAILABLE and the
//    file is shareable (feature-detect via `navigator.canShare`), or
//  - a download FALLBACK: a Blob + a programmatic `<a download>` click.
//
// No network, no backend. The filename carries the export timestamp so multiple
// exports never collide and are self-describing.

/** MIME type used for the exported bundle file. */
export const BUNDLE_MIME = 'application/json';

/**
 * Build the stamped export filename, e.g. `lingvago2-progress-2026-05-31T12-34-56.json`.
 *
 * The ISO `exportedAt` has `:` (illegal on some filesystems) replaced with `-`,
 * and the fractional-seconds suffix trimmed, so the name is portable.
 */
export function bundleFilename(exportedAt: string): string {
  const safe = exportedAt.replace(/\.\d+Z$/, 'Z').replace(/:/g, '-');
  return `lingvago2-progress-${safe}.json`;
}

/** How an export was delivered (so callers/tests can assert the path taken). */
export type ShareOutcome = 'shared' | 'downloaded';

/** Minimal slice of the Navigator share surface we feature-detect against. */
interface ShareCapableNavigator {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
}

/**
 * Decide whether the Web Share API can share THIS file. Requires both
 * `navigator.share` and `navigator.canShare` to exist AND `canShare` to accept
 * a `files` payload — headless Chromium (and most desktop browsers) lack a file
 * share target, so this returns false and the caller takes the download path.
 */
export function canShareFile(file: File, nav: Navigator = navigator): boolean {
  const n = nav as ShareCapableNavigator;
  if (typeof n.share !== 'function' || typeof n.canShare !== 'function') {
    return false;
  }
  try {
    return n.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Build a `File` for the bundle JSON with the stamped name. */
export function bundleFile(json: string, exportedAt: string): File {
  return new File([json], bundleFilename(exportedAt), { type: BUNDLE_MIME });
}

/** Trigger a download via a programmatic `<a download>` (the fallback path). */
function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke on the next tick so the click-initiated download has resolved the
    // object URL first (revoking synchronously can cancel the download).
    setTimeout(() => {
      URL.revokeObjectURL?.(url);
    }, 0);
  }
}

/**
 * Deliver the serialized bundle: share when supported, otherwise download.
 *
 * Returns which path was taken. If a share is attempted but the user CANCELS
 * (an `AbortError`), that is surfaced to the caller (rejects) — it is a user
 * choice, not a failure to fall back from. Any OTHER share error falls back to
 * the download path so the export still succeeds.
 */
export async function shareOrDownloadBundle(
  json: string,
  exportedAt: string,
  nav: Navigator = navigator,
): Promise<ShareOutcome> {
  const file = bundleFile(json, exportedAt);
  if (canShareFile(file, nav)) {
    try {
      await (nav as ShareCapableNavigator).share?.({
        files: [file],
        title: file.name,
      });
      return 'shared';
    } catch (err) {
      // User-initiated cancel: propagate so the UI stays quiet (no double export).
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      // Any other share failure → fall back to a plain download.
    }
  }
  downloadFile(file);
  return 'downloaded';
}
