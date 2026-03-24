import type { LearningMode } from './types'

const modes = new Map<string, LearningMode>()

export function registerMode(mode: LearningMode): void {
  modes.set(mode.id, mode)
}

export function getMode(id: string): LearningMode | undefined {
  return modes.get(id)
}

export function getAllModes(): LearningMode[] {
  return Array.from(modes.values())
}
