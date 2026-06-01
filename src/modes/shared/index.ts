// Shared mode surface (SPEC §6.3 parity + production-first DrillItem type). The
// gender/preposition generators (Tasks 2–3) and the drill screens (Task 4)
// consume from here.

export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from './check.ts';
export type {
  DrillItem,
  DrillOption,
  DrillSourceRef,
  McDrillItem,
  ProductionDrillItem,
} from './drillItem.ts';
export {
  assembleMcOrProduction,
  MIN_MC_OPTIONS,
  type AssembleInput,
  type DistractorCandidate,
} from './parity.ts';
export { recordDrillAttempt, type MasteryKey } from './recordAttempt.ts';
