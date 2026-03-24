import { useState, useEffect } from 'react'

export const THEMES = ['default', 'purple', 'corporate', 'cyber']

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('dc_theme') || 'default'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'default') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    localStorage.setItem('dc_theme', theme)
  }, [theme])

  return [theme, setTheme]
}
