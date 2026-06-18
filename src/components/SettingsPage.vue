<script setup lang="ts">
import type { AppThemeId, AppThemeOption } from '../themes/appThemes'

defineProps<{
  selectedTheme: AppThemeId
  themes: AppThemeOption[]
}>()

const emit = defineEmits<{
  'update:theme': [value: AppThemeId]
}>()
</script>

<template>
  <section class="tool-panel p-5">
    <div class="space-y-2">
      <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">Settings</div>
      <h2 class="app-title-text text-2xl font-semibold">Appearance</h2>
      <p class="app-muted-text text-sm">Choose a saved theme for the entire app. Your selection stays active after refresh.</p>
    </div>

    <div class="mt-6 max-w-md">
      <label class="floating-field">
        <span class="floating-field-label">Theme</span>
        <select
          :value="selectedTheme"
          class="monitor-select floating-select"
          @change="emit('update:theme', ($event.target as HTMLSelectElement).value as AppThemeId)"
        >
          <option v-for="theme in themes" :key="theme.id" :value="theme.id">{{ theme.label }}</option>
        </select>
      </label>
    </div>
  </section>
</template>
