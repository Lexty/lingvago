export interface LearningMode {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly icon: string

  getSessionItems(count: number): Promise<SessionItem[]>
  submitAnswer(item: SessionItem, answer: Answer): Promise<void>
  getStats(): Promise<ModeStats>
  getDueCount(): Promise<number>
}

export interface SessionItem {
  id: string
  question: string
  correctAnswer: string
  exerciseType: 'multiple-choice' | 'flip-card' | 'number-input'
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
