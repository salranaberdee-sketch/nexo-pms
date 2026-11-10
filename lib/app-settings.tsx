'use client'

/**
 * useAppSettings — fetches app_settings from Supabase once per mount.
 * Returns a typed helper so components get strongly-typed values with fallbacks.
 *
 * Usage:
 *   const { getSetting, channels, productTypes, brands, loading } = useAppSettings()
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export type SettingsMap = Record<string, string>

// ─── Context (optional — for sharing across a subtree without prop drilling) ───
const AppSettingsContext = createContext<AppSettingsValue | null>(null)

export type AppSettingsValue = {
  settings: SettingsMap
  loading:  boolean
  reload:   () => Promise<void>
  // Convenience getters with fallback defaults
  companyName:    string
  companyTagline: string
  channels:       string[]   // content_channels split by comma
  defaultChannel: string
  productTypes:   string[]   // product_types split by comma
  brands:         string[]   // brands split by comma
  fiscalYearStart: string    // "01" – "12"
  salesPeriodDays: number
}

function parseList(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAppSettings(): AppSettingsValue {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading]   = useState(true)
  const supabase = createClient()

  const reload = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('key, value')
    if (data) {
      const map: SettingsMap = {}
      for (const row of data) map[row.key] = row.value ?? ''
      setSettings(map)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { reload() }, [reload])

  return {
    settings,
    loading,
    reload,
    companyName:     settings.company_name     ?? 'Nexo PMS',
    companyTagline:  settings.company_tagline   ?? 'Product Management System',
    channels:        parseList(settings.content_channels) .length > 0
                       ? parseList(settings.content_channels)
                       : ['Facebook', 'Line', 'TikTok', 'YouTube', 'Instagram', 'X', 'Website'],
    defaultChannel:  settings.default_channel   ?? 'Facebook',
    productTypes:    parseList(settings.product_types),
    brands:          parseList(settings.brands),
    fiscalYearStart: settings.fiscal_year_start ?? '01',
    salesPeriodDays: parseInt(settings.sales_period_days ?? '30', 10) || 30,
  }
}

// ─── Provider (use in layout to share one fetch across the whole subtree) ─────
export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useAppSettings()
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}

// ─── Consumer ─────────────────────────────────────────────────────────────────
export function useSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside AppSettingsProvider')
  return ctx
}
