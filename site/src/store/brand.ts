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

      // Apply primary color as CSS variable
      const color = settings['brand.primaryColor']
      if (color) {
        document.documentElement.style.setProperty('--color-primary', color)
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
