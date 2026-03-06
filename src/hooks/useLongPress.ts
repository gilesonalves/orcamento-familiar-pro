import { useCallback, useMemo, useRef, useState } from 'react'

type UseLongPressOptions = {
  onLongPress: () => void
  onClick: () => void
  ms?: number
}

export const useLongPress = ({
  onLongPress,
  onClick,
  ms = 500,
}: UseLongPressOptions) => {
  const timerRef = useRef<number | null>(null)
  const triggeredByLongPressRef = useRef(false)
  const [isPressing, setIsPressing] = useState(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startPressTimer = useCallback(() => {
    triggeredByLongPressRef.current = false
    setIsPressing(true)

    clearTimer()
    timerRef.current = window.setTimeout(() => {
      triggeredByLongPressRef.current = true
      onLongPress()
    }, ms)
  }, [clearTimer, ms, onLongPress])

  const cancelPressTimer = useCallback(() => {
    clearTimer()
    setIsPressing(false)
  }, [clearTimer])

  const handleClick = useCallback(() => {
    if (triggeredByLongPressRef.current) {
      triggeredByLongPressRef.current = false
      return
    }

    onClick()
  }, [onClick])

  return useMemo(
    () => ({
      onTouchStart: startPressTimer,
      onTouchEnd: cancelPressTimer,
      onTouchMove: cancelPressTimer,
      onTouchCancel: cancelPressTimer,
      onMouseDown: startPressTimer,
      onMouseUp: cancelPressTimer,
      onMouseLeave: cancelPressTimer,
      onClick: handleClick,
      isPressing,
    }),
    [cancelPressTimer, handleClick, isPressing, startPressTimer],
  )
}
