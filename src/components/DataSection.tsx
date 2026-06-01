import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db as defaultDb, type Lingvago2Db } from '../db/index.ts';
import { exportBundleJson, type ProgressBundle } from '../telemetry/bundle.ts';
import {
  BundleValidationError,
  parseBundle,
  restoreBundle,
} from '../telemetry/restore.ts';
import { shareOrDownloadBundle } from '../telemetry/share.ts';
import styles from './DataSection.module.css';

/** Transient status/error feedback shown under the buttons. */
type Feedback =
  | { kind: 'ok'; key: string }
  | { kind: 'error'; key: string }
  | null;

/** Test seam: override the DB handle, the clock, and the share/download sink. */
export interface DataSectionProps {
  db?: Lingvago2Db;
  /** Injected export clock (defaults to wall-clock). Keeps the domain clock-free. */
  now?: () => Date;
  /** Override the share/download delivery (defaults to {@link shareOrDownloadBundle}). */
  deliver?: (json: string, exportedAt: string) => Promise<unknown>;
}

/**
 * Settings «Data» section (SPEC §13.3, contract AC7): Export the progress bundle
 * (share-with-fallback) and Import (restore YOUR OWN state, overwrite-on-confirm).
 *
 * Export builds the deterministic Task-1 bundle (injecting the wall clock at THIS
 * boundary so the domain stays clock-free), then shares it via the Web Share API
 * when available or downloads it as a stamped JSON file. Import reads a chosen
 * file, parses+validates it (a bad/incompatible file shows a clear error and
 * leaves current progress untouched), then asks for confirmation BEFORE the
 * overwriting restore. Multi-user merge is intentionally out of scope.
 */
export default function DataSection({
  db = defaultDb,
  now = () => new Date(),
  deliver = shareOrDownloadBundle,
}: DataSectionProps = {}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  // A validated bundle awaiting the user's overwrite confirmation (AC6). Null
  // means no restore is pending — restore NEVER runs without this being set + confirmed.
  const [pending, setPending] = useState<ProgressBundle | null>(null);

  const handleExport = useCallback(async () => {
    setFeedback(null);
    setBusy(true);
    try {
      const exportedAt = now().toISOString();
      const json = await exportBundleJson(db, { exportedAt });
      await deliver(json, exportedAt);
      setFeedback({ kind: 'ok', key: 'settings.data.exported' });
    } catch (err) {
      // A user-cancelled share (AbortError) is a silent no-op, not an error.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setFeedback({ kind: 'error', key: 'settings.data.exportError' });
    } finally {
      setBusy(false);
    }
  }, [db, now, deliver]);

  const handlePickFile = useCallback(() => {
    setFeedback(null);
    setPending(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChosen = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      // Reset the input value so re-choosing the SAME file fires `change` again.
      input.value = '';
      if (!file) return;

      setFeedback(null);
      setBusy(true);
      try {
        const text = await file.text();
        // Parse + validate BEFORE any DB mutation. A bad/incompatible bundle
        // throws here → current progress is never touched (AC6 error path).
        const bundle = parseBundle(text);
        setPending(bundle);
      } catch (err) {
        const key =
          err instanceof BundleValidationError
            ? 'settings.data.importInvalid'
            : 'settings.data.importError';
        setFeedback({ kind: 'error', key });
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const handleConfirmRestore = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBundle(db, pending);
      setPending(null);
      setFeedback({ kind: 'ok', key: 'settings.data.imported' });
    } catch {
      setPending(null);
      setFeedback({ kind: 'error', key: 'settings.data.importError' });
    } finally {
      setBusy(false);
    }
  }, [db, pending]);

  const handleCancelRestore = useCallback(() => {
    // Cancel → NO restore runs; current progress stays intact (AC6).
    setPending(null);
  }, []);

  return (
    <section className={styles.section} aria-labelledby="data-label">
      <p id="data-label" className={styles.label}>
        {t('settings.data.label')}
      </p>
      <p className={styles.hint}>{t('settings.data.hint')}</p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={() => {
            void handleExport();
          }}
          data-testid="data-export"
        >
          {t('settings.data.export')}
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={handlePickFile}
          data-testid="data-import"
        >
          {t('settings.data.import')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className={styles.hiddenInput}
          aria-hidden="true"
          tabIndex={-1}
          data-testid="data-file-input"
          onChange={(event) => {
            void handleFileChosen(event);
          }}
        />
      </div>

      {pending && (
        <div className={styles.confirm} role="alertdialog" aria-labelledby="data-confirm-text">
          <p id="data-confirm-text" className={styles.confirmText}>
            {t('settings.data.confirmOverwrite')}
          </p>
          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.confirmButton}
              disabled={busy}
              onClick={() => {
                void handleConfirmRestore();
              }}
              data-testid="data-confirm-restore"
            >
              {t('settings.data.confirm')}
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={busy}
              onClick={handleCancelRestore}
              data-testid="data-cancel-restore"
            >
              {t('settings.data.cancel')}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <p
          className={feedback.kind === 'error' ? styles.error : styles.status}
          role="status"
          data-testid="data-status"
        >
          {t(feedback.key)}
        </p>
      )}
    </section>
  );
}
