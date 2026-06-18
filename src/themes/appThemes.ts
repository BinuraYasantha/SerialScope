export type AppThemeId =
  | 'paper-sky'
  | 'slate-blue'
  | 'charcoal-emerald'
  | 'graphite-cyan'
  | 'navy-amber'
  | 'stone-indigo'

export interface AppThemeOption {
  id: AppThemeId
  label: string
}

export const THEME_STORAGE_KEY = 'serial-monitor-theme'
export const DEFAULT_THEME_ID: AppThemeId = 'slate-blue'

export const APP_THEMES: AppThemeOption[] = [
  { id: 'paper-sky', label: 'Paper + Sky' },
  { id: 'slate-blue', label: 'Slate + Blue' },
  { id: 'charcoal-emerald', label: 'Charcoal + Emerald' },
  { id: 'graphite-cyan', label: 'Graphite + Cyan' },
  { id: 'navy-amber', label: 'Deep Navy + Amber' },
  { id: 'stone-indigo', label: 'Stone + Indigo' },
]

export function isAppThemeId(value: string | null): value is AppThemeId {
  return APP_THEMES.some((theme) => theme.id === value)
}
