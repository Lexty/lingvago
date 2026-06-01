/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * App build version, injected by Vite's `define` from package.json `version`
 * (see vite.config.ts). Used as the telemetry bundle's `appVersion` (SPEC
 * §13.3 / contract AC2).
 */
declare const __APP_VERSION__: string;
