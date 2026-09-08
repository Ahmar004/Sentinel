import { useCallback, useEffect, useState } from 'react'

export type ThemeName = 'dark' | 'light'

const STORAGE_KEY = 'sentinel-theme'

function readStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

/**
 * roadmap.md Rule-5: dark blue is the default background, with a toggle to
 * a lighter greyish/cream theme. The choice is explicit and remembered,
 * not derived from `prefers-color-scheme`, so a coordinator's choice does
 * not flip on them because of their device's OS setting.
 */
export function useTheme(): { theme: ThemeName; toggleTheme: () => void } {
  const [theme, setTheme] = useState<ThemeName>(readStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
