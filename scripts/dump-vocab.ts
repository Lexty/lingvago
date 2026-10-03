// Prints every pack's vocabulary as JSON (input for verify-vocab-priberam.py).
import { PACKS } from '../src/packs/index.ts';

const cards = PACKS.flatMap((pack) => (pack.vocab?.cards ?? []).map((card) => ({ pack: pack.id, ...card })));
process.stdout.write(`${JSON.stringify(cards, null, 1)}\n`);
