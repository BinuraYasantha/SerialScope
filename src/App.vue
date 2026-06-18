<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from './components/AppHeader.vue'
import DeviceInfoPage from './components/DeviceInfoPage.vue'
import SettingsPage from './components/SettingsPage.vue'
import SerialCommandInput from './components/SerialCommandInput.vue'
import SerialMonitorOutput from './components/SerialMonitorOutput.vue'
import ToastStack from './components/ToastStack.vue'
import type { ToastItem, ToastTone } from './components/ToastStack.vue'
import { useSerialStore } from './stores/serial.store'
import { APP_THEMES, DEFAULT_THEME_ID, THEME_STORAGE_KEY, isAppThemeId, type AppThemeId } from './themes/appThemes'

const store = useSerialStore()
const {
  autoScroll,
  canConnect,
  canDisconnect,
  connectionState,
  displayEntries,
  errorMessage,
  paused,
  queuedChunkCount,
  rxBytes,
  searchQuery,
  selectedPortLabel,
  statusLabel,
  statusTone,
  supportMessage,
  supported,
  settings,
  timestampsEnabled,
  totalVisibleLines,
  txBytes,
} = storeToRefs(store)

type SectionId = 'Serial Monitor' | 'Settings' | 'Device Info'

const sectionItems: SectionId[] = ['Serial Monitor', 'Settings', 'Device Info']
const resourceItems = ['Tutorial', 'Buy Me a Coffee', 'Get Help']
const toasts = ref<ToastItem[]>([])
const unsupportedToastShown = ref(false)
const selectedTheme = ref<AppThemeId>(readStoredTheme())
const activeSection = ref<SectionId>('Serial Monitor')

applyTheme(selectedTheme.value)

onMounted(() => {
  void store.initialize()
})

watch(selectedTheme, (theme) => {
  applyTheme(theme)
})

watch(errorMessage, (message) => {
  if (!message) {
    return
  }

  addToast('error', message, 4200)
  store.clearError()
})

watch(
  [supported, supportMessage],
  ([isSupported, message]) => {
    if (isSupported || unsupportedToastShown.value || !message) {
      return
    }

    unsupportedToastShown.value = true
    addToast('error', message, 5200)
  },
  { immediate: true },
)

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(store.buildLogText())
    addToast('success', 'Copied visible serial output to the clipboard.', 2200)
  } catch {
    addToast('error', 'Clipboard access failed. Use download instead.', 3200)
  }
}

function downloadLog() {
  const blob = new Blob([store.buildLogText()], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')

  link.href = url
  link.download = `serial-log-${stamp}.txt`
  link.click()
  URL.revokeObjectURL(url)
  addToast('success', 'Downloaded the current serial log.', 2200)
}

function addToast(tone: ToastTone, message: string, duration = 2800) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
  toasts.value.push({ id, message, tone })

  window.setTimeout(() => {
    removeToast(id)
  }, duration)
}

function removeToast(id: string) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

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
</script>

<template>
  <div class="app-shell min-h-screen">
    <ToastStack :toasts="toasts" @close="removeToast" />

    <div class="grid min-h-screen lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside class="app-sidebar border-r">
        <div class="px-4 py-4">
          <div class="app-title-text text-xl font-semibold">SerialScope</div>
          <div class="app-muted-text mt-1 text-sm">v0.0.1</div>
        </div>

        <div class="app-divider border-t px-3 py-4">
          <div class="app-section-label px-2 text-xs font-semibold uppercase tracking-[0.18em]">Sections</div>
          <nav class="mt-3 space-y-1">
            <button
              v-for="item in sectionItems"
              :key="item"
              type="button"
              class="sidebar-item"
              :class="{ 'sidebar-item-active': item === activeSection }"
              @click="activeSection = item"
            >
              <span class="sidebar-item-icon">
                <svg
                  v-if="item === 'Serial Monitor'"
                  viewBox="0 0 24 24"
                  class="sidebar-item-icon-svg"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12h8" />
                  <path d="m8 8 4 4-4 4" />
                  <path d="M15 18h5" />
                </svg>
                <svg
                  v-else-if="item === 'Settings'"
                  viewBox="0 0 24 24"
                  class="sidebar-item-icon-svg"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.6 1.6a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.2 1.2 0 0 1-1.2 1.2h-2.2A1.2 1.2 0 0 1 10 20v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0L4.9 17.6a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.2 1.2 0 0 1-1.2-1.2v-2.2A1.2 1.2 0 0 1 4 9.5h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.6-1.6a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4A1.2 1.2 0 0 1 11.1 2.8h2.2A1.2 1.2 0 0 1 14.5 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.6 1.6a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.2 1.2 0 0 1 21.2 11v2.2a1.2 1.2 0 0 1-1.2 1.2h-.2a1 1 0 0 0-.9.6Z" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  class="sidebar-item-icon-svg"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="5" y="4" width="14" height="16" rx="2" />
                  <path d="M9 9h6M9 13h6" />
                </svg>
              </span>
              <span>{{ item }}</span>
            </button>
          </nav>
        </div>

        <div class="app-divider border-t px-3 py-4">
          <div class="app-section-label px-2 text-xs font-semibold uppercase tracking-[0.18em]">Resources</div>
          <nav class="mt-3 space-y-1">
            <button v-for="item in resourceItems" :key="item" type="button" class="sidebar-item">
              <span class="sidebar-item-icon">•</span>
              <span>{{ item }}</span>
            </button>
          </nav>
        </div>
      </aside>

      <main class="min-w-0">
        <div class="app-topbar app-divider border-b px-4 py-3">
          <AppHeader
            :port-label="selectedPortLabel"
            :status-label="statusLabel"
            :status-tone="statusTone"
            :connection-state="connectionState"
            :baud-rate="settings.baudRate"
            :baud-rates="store.baudRates"
            :data-bits="settings.dataBits"
            :data-bits-options="store.dataBitsOptions"
            :stop-bits="settings.stopBits"
            :stop-bits-options="store.stopBitsOptions"
            :parity="settings.parity"
            :parity-options="store.parityOptions"
            :flow-control="settings.flowControl"
            :flow-control-options="store.flowControlOptions"
            :can-connect="canConnect"
            :can-disconnect="canDisconnect"
            :busy="connectionState === 'connecting' || connectionState === 'disconnecting'"
            @choose-port="store.choosePort"
            @update:baud-rate="settings.baudRate = $event"
            @update:data-bits="settings.dataBits = $event"
            @update:stop-bits="settings.stopBits = $event"
            @update:parity="settings.parity = $event"
            @update:flow-control="settings.flowControl = $event"
            @connect="store.connect"
            @disconnect="store.disconnect"
          />
        </div>

        <div class="space-y-4 p-4">
          <div v-if="activeSection === 'Serial Monitor'" class="space-y-4">
            <SerialMonitorOutput
              :entries="displayEntries"
              :auto-scroll="autoScroll"
              :paused="paused"
              :queued-chunk-count="queuedChunkCount"
              :rx-bytes="rxBytes"
              :timestamps-enabled="timestampsEnabled"
              :search-query="searchQuery"
              :total-visible-lines="totalVisibleLines"
              :tx-bytes="txBytes"
              @clear="store.clearOutput"
              @copy="copyOutput"
              @download="downloadLog"
              @toggle-auto-scroll="store.toggleAutoScroll"
              @toggle-pause="store.togglePause"
              @toggle-timestamps="store.toggleTimestamps"
              @update:search-query="store.setSearchQuery"
            />

            <SerialCommandInput />
          </div>

          <SettingsPage
            v-else-if="activeSection === 'Settings'"
            :selected-theme="selectedTheme"
            :themes="APP_THEMES"
            @update:theme="selectedTheme = $event"
          />

          <DeviceInfoPage
            v-else
            :port-label="selectedPortLabel"
          />
        </div>
      </main>
    </div>
  </div>
</template>
