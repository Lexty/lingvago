import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { initI18n } from '../i18n/config.ts';

// Initialize i18n once for the test suite so components rendering `t(...)`
// resolve real strings instead of raw keys.
initI18n();
