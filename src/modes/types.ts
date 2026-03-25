import type { ComponentType } from 'react'

export interface ExerciseComponentProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

export interface SetupComponentProps {
  onStart: () => void
}

export interface LearningMode {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly icon: string

  /** Map of exerciseType → component for rendering exercises. */
  readonly exerciseComponents: Record<string, ComponentType<ExerciseComponentProps>>

  /** Optional setup screen shown before the session starts. */
  readonly setupComponent?: ComponentType<SetupComponentProps>

  getSessionItems(count: number): Promise<SessionItem[]>
  submitAnswer(item: SessionItem, answer: Answer): Promise<void>
  getStats(): Promise<ModeStats>
  getDueCount(): Promise<number>
}

export interface SessionItem {
  id: string
  question: string
  correctAnswer: string
  exerciseType: string
  options?: string[]
  payload: Record<string, unknown>
}

export interface Answer {
  value: string
  correct: boolean
  fsrsRating?: number
  timeMs: number
}

export interface ModeStats {
  totalItems: number
  dueNow: number
  averageRetention: number
  totalReviews: number
}
