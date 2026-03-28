import { create } from 'zustand'
import { settingsApi } from '../api/settings'

interface BrandState {
  appName: string
  logoUrl: string
  primaryColor: string
  faviconUrl: string
  loaded: boolean
  load: () => Promise<void>
}

export const useBrandStore = create<BrandState>((set) => ({
  appName: 'Library Portal',
  logoUrl: '',
  primaryColor: '#2563eb',
  faviconUrl: '',
  loaded: false,
  load: async () => {
    try {
      const { settings } = await settingsApi.getPublic()
      set({
        appName: settings['brand.appName'] || 'Library Portal',
        logoUrl: settings['brand.logoUrl'] || '',
        primaryColor: settings['brand.primaryColor'] || '#2563eb',
        faviconUrl: settings['brand.faviconUrl'] || '',
        loaded: true,
      })

      // Apply primary color as CSS variables
      const color = settings['brand.primaryColor']
      if (color) {
        document.documentElement.style.setProperty('--color-primary', color)
        // Compute a darker shade for hover states
        const darken = (hex: string) => {
          const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 25)
          const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 25)
          const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 25)
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        }
        document.documentElement.style.setProperty('--color-primary-dark', darken(color))
      }

      // Apply favicon
      const favicon = settings['brand.faviconUrl']
      if (favicon) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = favicon
      }

      // Apply page title
      const name = settings['brand.appName']
      if (name) document.title = name
    } catch {
      set({ loaded: true })
    }
  },
}))
