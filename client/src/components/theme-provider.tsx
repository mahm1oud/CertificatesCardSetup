import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'default' | 'colorful' | 'vibrant'
type DarkMode = 'light' | 'dark'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultDarkMode?: DarkMode
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  darkMode: DarkMode
  setTheme: (theme: Theme) => void
  setDarkMode: (darkMode: DarkMode) => void
  toggleDarkMode: () => void
}

const initialState: ThemeProviderState = {
  theme: 'default',
  darkMode: 'light',
  setTheme: () => {},
  setDarkMode: () => {},
  toggleDarkMode: () => {},
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'default',
  defaultDarkMode = 'light',
  storageKey = 'ui-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey + '-style')
      return (stored as Theme) || defaultTheme
    }
    return defaultTheme
  })

  const [darkMode, setDarkModeState] = useState<DarkMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey + '-dark')
      return (stored as DarkMode) || defaultDarkMode
    }
    return defaultDarkMode
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const root = window.document.documentElement

    // Remove all theme classes
    root.classList.remove('dark')
    root.removeAttribute('data-theme')

    // Apply dark mode
    if (darkMode === 'dark') {
      root.classList.add('dark')
    }

    // Apply theme
    if (theme !== 'default') {
      root.setAttribute('data-theme', theme)
    }
  }, [theme, darkMode])

  const setTheme = useCallback((newTheme: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey + '-style', newTheme)
    }
    setThemeState(newTheme)
  }, [storageKey])

  const setDarkMode = useCallback((newDarkMode: DarkMode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey + '-dark', newDarkMode)
    }
    setDarkModeState(newDarkMode)
  }, [storageKey])

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = darkMode === 'light' ? 'dark' : 'light'
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey + '-dark', newDarkMode)
    }
    setDarkModeState(newDarkMode)
  }, [darkMode, storageKey])

  const contextValue: ThemeProviderState = {
    theme,
    darkMode,
    setTheme,
    setDarkMode,
    toggleDarkMode,
  }

  return (
    <ThemeProviderContext.Provider value={contextValue}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}