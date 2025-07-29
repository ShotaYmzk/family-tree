import { useState, useCallback, useRef } from 'react'

export interface HistoryState<T> {
  data: T
  action: string
  timestamp: number
}

interface UseUndoRedoReturn<T> {
  currentState: T
  canUndo: boolean
  canRedo: boolean
  pushState: (state: T, action: string) => void
  undo: () => T | null
  redo: () => T | null
  clearHistory: () => void
  getHistoryInfo: () => {
    totalStates: number
    currentIndex: number
    lastAction: string | null
  }
}

export function useUndoRedo<T>(
  initialState: T,
  maxHistorySize: number = 50
): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>[]>([
    { data: initialState, action: 'initial', timestamp: Date.now() }
  ])
  const [currentIndex, setCurrentIndex] = useState(0)
  const isUndoRedoOperation = useRef(false)

  const currentState = history[currentIndex]?.data || initialState

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  const pushState = useCallback((state: T, action: string) => {
    // アンドゥ・リドゥ操作中は履歴を追加しない
    if (isUndoRedoOperation.current) {
      return
    }

    setHistory(prevHistory => {
      const newState: HistoryState<T> = {
        data: state,
        action,
        timestamp: Date.now()
      }

      // 現在の位置以降の履歴を削除（新しい操作で分岐）
      const newHistory = prevHistory.slice(0, currentIndex + 1)
      newHistory.push(newState)

      // 履歴サイズの制限
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(1) // 最古の履歴を削除
      }

      return newHistory
    })

    setCurrentIndex(prevIndex => {
      const newIndex = Math.min(prevIndex + 1, maxHistorySize - 1)
      return newIndex
    })
  }, [currentIndex, maxHistorySize])

  const undo = useCallback((): T | null => {
    if (!canUndo) return null

    isUndoRedoOperation.current = true
    setCurrentIndex(prevIndex => prevIndex - 1)
    
    // 次のフレームでフラグをリセット
    setTimeout(() => {
      isUndoRedoOperation.current = false
    }, 0)

    return history[currentIndex - 1]?.data || null
  }, [canUndo, currentIndex, history])

  const redo = useCallback((): T | null => {
    if (!canRedo) return null

    isUndoRedoOperation.current = true
    setCurrentIndex(prevIndex => prevIndex + 1)
    
    // 次のフレームでフラグをリセット
    setTimeout(() => {
      isUndoRedoOperation.current = false
    }, 0)

    return history[currentIndex + 1]?.data || null
  }, [canRedo, currentIndex, history])

  const clearHistory = useCallback(() => {
    setHistory([{ data: currentState, action: 'reset', timestamp: Date.now() }])
    setCurrentIndex(0)
  }, [currentState])

  const getHistoryInfo = useCallback(() => ({
    totalStates: history.length,
    currentIndex,
    lastAction: history[currentIndex]?.action || null
  }), [history.length, currentIndex, history])

  return {
    currentState,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    clearHistory,
    getHistoryInfo
  }
} 