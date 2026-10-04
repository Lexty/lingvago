// "I don't understand the sentence" help for authored exercises.
//
// A grammar exercise must not fail on vocabulary: a learner who cannot read
// `O frigorífico está vazio` cannot choose between `nada` and `ninguém`, and
// that wrong answer says nothing about the grammar. So every exercise with a
// Portuguese prompt carries:
//  - `gloss` — 1–4 key words or chunks OF THE PROMPT with their meaning, shown
//    on request BEFORE answering. They restore the context (vazio — empty) but
//    never the target: the gap's answer is not in the prompt, and in a `choose`
//    exercise the construction being read (tem de, pode…) is never glossed;
//  - `meaning` — a translation of the completed sentence, shown AFTER checking
//    (and on «show the answer»), when giving the meaning away no longer matters.
//
// The help is authored per unit (`unitNN.help.ts`) in a compact text form and
// merged into the packs here, so the exercise files stay readable.

import type { Gloss, Localized, PackExercise, PackGroup } from './types.ts';

/** `pt | ru | en ; pt | ru | en` → glosses. */
function parseGlosses(text: string): Gloss[] {
  return text
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => {
      const [pt, ru, en] = part.split('|').map((field) => field.trim());
      if (!pt || !ru || !en) throw new Error(`bad gloss: «${part}»`);
      return { pt, ru, en };
    });
}

/** One exercise's help: glosses, then the meaning in Russian and English. */
export type HelpEntry = readonly [glosses: string, ru: string, en: string];

export interface ExerciseHelp {
  gloss: Gloss[];
  meaning: Localized;
}

export function parseHelp(entry: HelpEntry): ExerciseHelp {
  const [glosses, ru, en] = entry;
  return { gloss: parseGlosses(glosses), meaning: { ru, en } };
}

/** The groups with each exercise's help attached (by exercise id). */
export function withHelp(
  groups: readonly PackGroup[],
  help: Readonly<Record<string, HelpEntry>>,
): PackGroup[] {
  const used = new Set<string>();
  const result = groups.map((group) => ({
    ...group,
    exercises: group.exercises.map((exercise): PackExercise => {
      const entry = help[exercise.id];
      if (!entry) return exercise;
      used.add(exercise.id);
      const { gloss, meaning } = parseHelp(entry);
      return { ...exercise, gloss, meaning };
    }),
  }));
  const unknown = Object.keys(help).filter((id) => !used.has(id));
  if (unknown.length > 0) throw new Error(`help for unknown exercises: ${unknown.join(', ')}`);
  return result;
}
