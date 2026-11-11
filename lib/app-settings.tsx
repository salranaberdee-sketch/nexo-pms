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
import { parseCSV } from '@/lib/utils'

export type SettingsMap = Record<string, string>

// ─── Context (optional — for sharing across a subtree without prop drilling) ───
const AppSettingsContext = createContext<AppSettingsValue | null>(null)

export type AppSettingsValue = {
  settings: SettingsMap
  loading:  boolean
  reload:   () => Promise<void>
  // Convenience getters with fallback defaults
  companyName:     string
  companyTagline:  string
  channels:        string[]  // content_channels split by comma
  defaultChannel:  string
  objectives:      string[]  // content_objectives split by comma
  productTypes:    string[]  // product_types split by comma
  brands:          string[]  // brands split by comma
  fiscalYearStart: string    // "01" – "12"
  salesPeriodDays: number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAppSettings(): AppSettingsValue {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading]   = useState(true)

  // `reload` has stable identity ([] deps) because createClient() returns the
  // module-level singleton — the reference never changes between renders.
  // Previously `supabase` was listed as a dep, causing `reload` to get a new
  // reference on every render (even though the underlying client was unchanged),
  // which made the useEffect re-run on every render.
  const reload = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('app_settings').select('key, value')
    if (data) {
      const map: SettingsMap = {}
      for (const row of data) map[row.key] = row.value ?? ''
      setSettings(map)
    }
    setLoading(false)
  }, []) // stable — supabase singleton needs no dep

  useEffect(() => { reload() }, [reload])

  const channelList = parseCSV(settings.content_channels)

  return {
    settings,
    loading,
    reload,
    companyName:     settings.company_name     ?? 'Nexo PMS',
    companyTagline:  settings.company_tagline   ?? 'Product Management System',
    channels:        channelList.length > 0
                       ? channelList
                       : ['Facebook', 'Line', 'TikTok', 'YouTube', 'Instagram', 'X', 'Website'],
    defaultChannel:  settings.default_channel   ?? 'Facebook',
    objectives:      parseCSV(settings.content_objectives),
    productTypes:    parseCSV(settings.product_types),
    brands:          parseCSV(settings.brands),
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
