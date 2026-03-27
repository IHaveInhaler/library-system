import { create } from 'zustand'

function getInitialTheme(): boolean {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
}

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const isDark = getInitialTheme()
  applyTheme(isDark)
  return {
    isDark,
    toggle: () => {
      const next = !get().isDark
      applyTheme(next)
      set({ isDark: next })
    },
  }
})
