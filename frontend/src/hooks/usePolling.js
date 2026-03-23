import { useEffect, useRef } from 'react'

export function usePolling(callback, intervalMs = 5000) {
  const savedCallback = useRef(callback)
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) savedCallback.current()
    }
    tick() // run immediately
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
