import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/index.ts';
import i18n from '../i18n/config.ts';
import { exportBundleJson } from '../telemetry/bundle.ts';
import { clearProgress, seedProgress } from '../telemetry/testFixtures.ts';
import DataSection from './DataSection.tsx';

const NOW = () => new Date('2026-05-31T12:34:56.000Z');

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await clearProgress(db);
});

afterEach(async () => {
  await clearProgress(db);
  vi.restoreAllMocks();
});

/**
 * Build a File whose `.text()` resolves to `content`. jsdom's File does not
 * implement the standard `Blob.text()` (present in every real browser + the
 * e2e Chromium), so we attach it here for the component unit tests only.
 */
function jsonFile(content: string, name = 'backup.json'): File {
  const file = new File([content], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    configurable: true,
  });
  return file;
}

/** Fire a change on the hidden file input with the given file. */
function chooseFile(file: File): void {
  const input = screen.getByTestId('data-file-input') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

/** A distinct marker progress row used to prove progress is left untouched. */
async function putMarker(): Promise<void> {
  await db.skillMastery.put({
    id: 'marker',
    skillId: 'marker',
    mastery: 0.99,
    attempts: 1,
    updatedAt: NOW(),
  });
}

describe('DataSection — export', () => {
  it('builds + delivers the bundle and shows success', async () => {
    await seedProgress(db);
    const deliver = vi.fn().mockResolvedValue('downloaded');

    render(<DataSection db={db} now={NOW} deliver={deliver} />);

    fireEvent.click(screen.getByTestId('data-export'));

    await waitFor(() => {
      expect(deliver).toHaveBeenCalledTimes(1);
    });
    const [json, exportedAt] = deliver.mock.calls[0] as [string, string];
    expect(exportedAt).toBe('2026-05-31T12:34:56.000Z');
    expect(JSON.parse(json).schemaVersion).toBe(1);
    expect(await screen.findByText('Progress exported.')).toBeInTheDocument();
  });

  it('stays silent when the user cancels a share (AbortError)', async () => {
    await seedProgress(db);
    const deliver = vi
      .fn()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'));

    render(<DataSection db={db} now={NOW} deliver={deliver} />);
    fireEvent.click(screen.getByTestId('data-export'));

    await waitFor(() => {
      expect(deliver).toHaveBeenCalled();
    });
    // No status line — a cancel is a no-op, not an error.
    expect(screen.queryByTestId('data-status')).not.toBeInTheDocument();
  });

  it('shows an error when delivery fails with a non-AbortError', async () => {
    await seedProgress(db);
    // A real failure (not a user cancel) → the export-error message is shown.
    const deliver = vi.fn().mockRejectedValue(new Error('disk full'));

    render(<DataSection db={db} now={NOW} deliver={deliver} />);
    fireEvent.click(screen.getByTestId('data-export'));

    await waitFor(() => {
      expect(deliver).toHaveBeenCalled();
    });
    expect(
      await screen.findByText("Couldn't export your progress. Please try again."),
    ).toBeInTheDocument();
  });
});

describe('DataSection — import', () => {
  it('restores a valid bundle ONLY after confirmation (round-trip)', async () => {
    await seedProgress(db);
    const json = await exportBundleJson(db, { exportedAt: NOW().toISOString() });

    // Wipe progress so a successful restore is observable.
    await clearProgress(db);
    expect(await db.skillMastery.count()).toBe(0);

    render(<DataSection db={db} now={NOW} deliver={vi.fn()} />);

    fireEvent.click(screen.getByTestId('data-import'));
    chooseFile(jsonFile(json));

    // Confirmation is required first — nothing restored yet.
    expect(await screen.findByTestId('data-confirm-restore')).toBeInTheDocument();
    expect(await db.skillMastery.count()).toBe(0);

    fireEvent.click(screen.getByTestId('data-confirm-restore'));

    await waitFor(async () => {
      expect(await db.skillMastery.count()).toBe(1);
    });
    expect(await screen.findByText('Progress restored.')).toBeInTheDocument();
  });

  it('cancelling the confirmation does NOT restore (progress intact)', async () => {
    await seedProgress(db);
    const json = await exportBundleJson(db, { exportedAt: NOW().toISOString() });
    // Replace progress with a DISTINCT marker so we can prove it was untouched.
    await clearProgress(db);
    await putMarker();

    render(<DataSection db={db} now={NOW} deliver={vi.fn()} />);
    fireEvent.click(screen.getByTestId('data-import'));
    chooseFile(jsonFile(json));

    fireEvent.click(await screen.findByTestId('data-cancel-restore'));

    // Confirmation gone, restore never ran → the marker row survives.
    expect(screen.queryByTestId('data-confirm-restore')).not.toBeInTheDocument();
    const rows = await db.skillMastery.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('marker');
  });

  it('shows an error and keeps progress when restore throws after confirmation', async () => {
    await seedProgress(db);
    const json = await exportBundleJson(db, { exportedAt: NOW().toISOString() });
    // Replace progress with a DISTINCT marker that must survive a failed restore.
    await clearProgress(db);
    await putMarker();

    // The bundle parses + validates fine (confirmation is offered), but the
    // transactional restore itself fails at the DB level.
    const txSpy = vi
      .spyOn(db, 'transaction')
      .mockRejectedValue(new Error('db unavailable') as never);

    render(<DataSection db={db} now={NOW} deliver={vi.fn()} />);
    fireEvent.click(screen.getByTestId('data-import'));
    chooseFile(jsonFile(json));

    fireEvent.click(await screen.findByTestId('data-confirm-restore'));

    // User sees the import error, the confirmation UI is dismissed…
    expect(
      await screen.findByText("Couldn't import that file. Your current progress is unchanged."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('data-confirm-restore')).not.toBeInTheDocument();
    // …and the existing marker progress is intact (no partial overwrite).
    const rows = await db.skillMastery.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('marker');

    txSpy.mockRestore();
  });

  it('shows a clear error for an invalid file and leaves progress intact', async () => {
    await putMarker();

    render(<DataSection db={db} now={NOW} deliver={vi.fn()} />);
    fireEvent.click(screen.getByTestId('data-import'));
    chooseFile(jsonFile('not json at all {{{'));

    expect(
      await screen.findByText(
        "That file isn't a valid lingvago2 progress backup. Your current progress is unchanged.",
      ),
    ).toBeInTheDocument();
    // No confirmation offered, progress untouched.
    expect(screen.queryByTestId('data-confirm-restore')).not.toBeInTheDocument();
    expect(await db.skillMastery.count()).toBe(1);
  });

  it('shows a clear error for an incompatible schemaVersion (no restore)', async () => {
    await putMarker();
    const incompatible = JSON.stringify({
      schemaVersion: 999,
      appVersion: 'x',
      contentVersion: null,
      exportedAt: NOW().toISOString(),
      data: {},
    });

    render(<DataSection db={db} now={NOW} deliver={vi.fn()} />);
    fireEvent.click(screen.getByTestId('data-import'));
    chooseFile(jsonFile(incompatible));

    expect(await screen.findByTestId('data-status')).toHaveTextContent(
      'Your current progress is unchanged.',
    );
    expect(screen.queryByTestId('data-confirm-restore')).not.toBeInTheDocument();
    expect(await db.skillMastery.count()).toBe(1);
  });
});
