// Public surface of the content layer (SPEC §7.1/§7.3). The app only needs the
// startup entry point + the bundle/alias data shapes; the rest of the loader
// (fetch/load/remap internals) is imported straight from ./loader.ts by tests.
export { bootstrapContent, type LoadContentResult } from './loader.ts';
export type { ContentAliasTable, ContentBundle } from './types.ts';
