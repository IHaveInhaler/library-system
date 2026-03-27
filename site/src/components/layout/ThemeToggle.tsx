import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/theme'

export function ThemeToggle() {
  const { isDark, toggle } = useThemeStore()

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 focus:outline-none
        ${isDark ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-300
          ${isDark ? 'translate-x-7' : 'translate-x-1'}`}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-blue-600" />
        ) : (
          <Sun className="h-3 w-3 text-yellow-500" />
        )}
      </span>
    </button>
  )
}
