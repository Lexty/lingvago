import { useState, useCallback, useRef, useEffect } from 'react'
import { db } from '../db/index'
import type { LearningMode, SessionItem, Answer } from '../modes/types'

type SessionStatus = 'loading' | 'in-progress' | 'finished' | 'error'

export function useSession(mode: LearningMode, sessionSize: number) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [items, setItems] = useState<SessionItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const startedAt = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const modeRef = useRef(mode)
  const sessionSizeRef = useRef(sessionSize)
  modeRef.current = mode
  sessionSizeRef.current = sessionSize

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const loadSession = useCallback(
    () => {
      const currentMode = modeRef.current
      const currentSize = sessionSizeRef.current

      return currentMode.getSessionItems(currentSize).then((sessionItems) => {
        if (sessionItems.length === 0) {
          setItems([])
          setStatus('finished')
          return
        }

        setItems(sessionItems)
        startedAt.current = Date.now()
        setStatus('in-progress')
        setCurrentIndex(0)
        setCorrectCount(0)
        setElapsedTime(0)
        setError(null)

        stopTimer()
        timerRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - startedAt.current) / 1000))
        }, 1000)
      }).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      })
    },
    [stopTimer],
  )

  const startSession = useCallback(() => {
    setStatus('loading')
    setCurrentIndex(0)
    setCorrectCount(0)
    setError(null)
    setElapsedTime(0)
    stopTimer()
    loadSession()
  }, [stopTimer, loadSession])

  const submitAnswer = useCallback(
    async (answer: Answer) => {
      const item = items[currentIndex]
      if (!item) return

      try {
        await modeRef.current.submitAnswer(item, answer)
        if (answer.correct) {
          setCorrectCount((c) => c + 1)
        }

        const nextIndex = currentIndex + 1
        if (nextIndex >= items.length) {
          stopTimer()
          setStatus('finished')

          await db.sessions.add({
            modeId: modeRef.current.id,
            startedAt: startedAt.current,
            finishedAt: Date.now(),
            totalCards: items.length,
            correctCards: answer.correct ? correctCount + 1 : correctCount,
          })
        } else {
          setCurrentIndex(nextIndex)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    },
    [items, currentIndex, correctCount, stopTimer],
  )

  // Initial load — async setState in .then() avoids sync-setState-in-effect lint rule
  useEffect(() => {
    loadSession()
    return stopTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    status,
    currentItem: items[currentIndex] ?? null,
    currentIndex,
    totalCount: items.length,
    correctCount,
    elapsedTime,
    error,
    startSession,
    submitAnswer,
  }
}
