import { ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY, isAppThemeId, type AppThemeId } from '../themes/appThemes'

export const useAppStore = defineStore('app', () => {
  const selectedTheme = ref<AppThemeId>(DEFAULT_THEME_ID)

  function initializeTheme() {
    const theme = readStoredTheme()
    selectedTheme.value = theme
    applyTheme(theme)
  }

  function setTheme(theme: AppThemeId) {
    selectedTheme.value = theme
    applyTheme(theme)
  }

  return {
    initializeTheme,
    selectedTheme,
    setTheme,
  }
})

function readStoredTheme(): AppThemeId {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_ID
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isAppThemeId(storedTheme) ? storedTheme : DEFAULT_THEME_ID
}

function applyTheme(theme: AppThemeId) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }
}
