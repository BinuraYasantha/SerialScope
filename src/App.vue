<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from './components/AppHeader.vue'
import HomePage from './components/HomePage.vue'
import SerialCommandInput from './components/SerialCommandInput.vue'
import SerialMonitorOutput from './components/SerialMonitorOutput.vue'
import ToastStack from './components/ToastStack.vue'
import type { ToastItem, ToastTone } from './components/ToastStack.vue'
import { useSerialStore } from './stores/serial.store'
import { APP_THEMES, DEFAULT_THEME_ID, THEME_STORAGE_KEY, isAppThemeId, type AppThemeId } from './themes/appThemes'

type AppView = 'landing' | 'app'

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
  supportMessage,
  supported,
  settings,
  timestampsEnabled,
  totalVisibleLines,
  txBytes,
  uiNotice,
} = storeToRefs(store)

const resourceItems = ['Tutorial']
const toasts = ref<ToastItem[]>([])
const unsupportedToastShown = ref(false)
const selectedTheme = ref<AppThemeId>(readStoredTheme())
const currentView = ref<AppView>(readCurrentView())
const lastConnectionState = ref(connectionState.value)
const storeInitialized = ref(false)

applyTheme(selectedTheme.value)
updateDocumentMetadata(currentView.value)

onMounted(() => {
  window.addEventListener('popstate', syncCurrentView)

  if (currentView.value === 'app') {
    void initializeStoreOnce()
  }
})

onUnmounted(() => {
  window.removeEventListener('popstate', syncCurrentView)
})

watch(selectedTheme, (theme) => {
  applyTheme(theme)
})

watch(currentView, (view) => {
  updateDocumentMetadata(view)

  if (view === 'app') {
    void initializeStoreOnce()
  }
})

watch(errorMessage, (message) => {
  if (currentView.value !== 'app' || !message) {
    return
  }

  addToast('error', message, 4200)
  store.clearError()
})

watch(
  [supported, supportMessage],
  ([isSupported, message]) => {
    if (currentView.value !== 'app' || isSupported || unsupportedToastShown.value || !message) {
      return
    }

    unsupportedToastShown.value = true
    addToast('error', message, 5200)
  },
  { immediate: true },
)

watch(connectionState, (state) => {
  if (currentView.value !== 'app') {
    lastConnectionState.value = state
    return
  }

  const previousState = lastConnectionState.value

  if (state === 'connected' && previousState !== 'connected') {
    addToast('success', `Connected to ${selectedPortLabel.value} at ${settings.value.baudRate} baud.`, 2800)
  }

  if ((state === 'port-selected' || state === 'idle') && previousState === 'disconnecting') {
    addToast('info', 'Serial connection closed.', 2200)
  }

  lastConnectionState.value = state
})

watch(uiNotice, (notice) => {
  if (currentView.value !== 'app' || !notice) {
    return
  }

  addToast(notice.tone, notice.message, 2600)
  store.clearUiNotice()
})

async function initializeStoreOnce() {
  if (storeInitialized.value) {
    return
  }

  storeInitialized.value = true
  await store.initialize()
}

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

function readCurrentView(): AppView {
  if (typeof window === 'undefined') {
    return 'landing'
  }

  return normalizePath(window.location.pathname) === '/app' ? 'app' : 'landing'
}

function syncCurrentView() {
  currentView.value = readCurrentView()
}

function openApplication() {
  if (typeof window === 'undefined') {
    currentView.value = 'app'
    return
  }

  const nextPath = '/app'

  if (normalizePath(window.location.pathname) !== nextPath) {
    window.history.pushState({}, '', nextPath)
  }

  currentView.value = 'app'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openLandingPage() {
  if (typeof window === 'undefined') {
    currentView.value = 'landing'
    return
  }

  const nextPath = '/'

  if (normalizePath(window.location.pathname) !== nextPath) {
    window.history.pushState({}, '', nextPath)
  }

  currentView.value = 'landing'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function normalizePath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized === '' ? '/' : normalized
}

function updateDocumentMetadata(view: AppView) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  const title =
    view === 'app'
      ? 'SerialScope App - Browser Serial Monitor'
      : 'SerialScope - Browser-Based Serial Monitor for USB Devices'
  const description =
    view === 'app'
      ? 'Use the SerialScope serial monitor app to connect to USB serial devices, inspect live logs, and send commands from your browser.'
      : 'SerialScope is a browser-based serial monitor for USB devices with live serial output, saved command presets, XML import, and Web Serial support.'
  const canonicalPath = view === 'app' ? '/app' : '/'
  const robots = view === 'app' ? 'noindex, nofollow' : 'index, follow'

  document.title = title
  setMetaTag('name', 'description', description)
  setMetaTag('name', 'robots', robots)
  setMetaTag('property', 'og:title', title)
  setMetaTag('property', 'og:description', description)
  setMetaTag('property', 'og:url', `${window.location.origin}${canonicalPath}`)
  setMetaTag('name', 'twitter:title', title)
  setMetaTag('name', 'twitter:description', description)

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = `${window.location.origin}${canonicalPath}`
}

function setMetaTag(attribute: 'name' | 'property', value: string, content: string) {
  let tag = document.head.querySelector(`meta[${attribute}="${value}"]`) as HTMLMetaElement | null

  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attribute, value)
    document.head.appendChild(tag)
  }

  tag.content = content
}
</script>

<template>
  <div class="app-shell min-h-screen">
    <ToastStack v-if="currentView === 'app'" :toasts="toasts" @close="removeToast" />

    <HomePage
      v-if="currentView === 'landing'"
      :selected-theme="selectedTheme"
      @update:theme="selectedTheme = $event"
      @open-monitor="openApplication"
    />

    <div v-else class="grid min-h-screen lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside class="app-sidebar border-r">
        <div class="px-4 py-4">
          <button type="button" class="flex items-center gap-3 text-left" @click="openLandingPage">
            <span class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-panel-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <svg viewBox="0 0 64 64" class="h-7 w-7" fill="none" aria-hidden="true">
                <rect x="8" y="8" width="48" height="48" rx="12" fill="#0F172A" />
                <rect x="8" y="8" width="48" height="48" rx="12" stroke="#38BDF8" stroke-width="3" />
                <path d="M22 25 30 32 22 39" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M36 39H44" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" />
              </svg>
            </span>
            <div>
              <div class="app-title-text text-xl font-semibold">SerialScope</div>
              <div class="app-muted-text mt-1 text-sm">v0.0.1</div>
            </div>
          </button>
        </div>

        <div class="app-divider border-t px-3 py-4">
          <div class="app-section-label px-2 text-xs font-semibold uppercase tracking-[0.18em]">Sections</div>
          <nav class="mt-3 space-y-1">
            <button type="button" class="sidebar-item sidebar-item-active">
              <span class="sidebar-item-icon">
                <svg
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
              </span>
              <span>Serial Monitor</span>
            </button>
          </nav>
        </div>

        <div class="app-divider border-t px-3 py-4">
          <div class="app-section-label px-2 text-xs font-semibold uppercase tracking-[0.18em]">Resources</div>
          <nav class="mt-3 space-y-1">
            <button v-for="item in resourceItems" :key="item" type="button" class="sidebar-item">
              <span class="sidebar-item-icon">
                <svg
                  viewBox="0 0 24 24"
                  class="sidebar-item-icon-svg"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="m10 10 4 2-4 2Z" />
                </svg>
              </span>
              <span>{{ item }}</span>
            </button>
          </nav>
        </div>
      </aside>

      <main class="min-w-0">
        <div class="app-topbar app-divider border-b px-4 py-3">
          <AppHeader
            :port-label="selectedPortLabel"
            :connection-state="connectionState"
            :selected-theme="selectedTheme"
            :themes="APP_THEMES"
            :baud-rate="settings.baudRate"
            :baud-rates="store.baudRates"
            :data-bits="settings.dataBits"
            :data-bits-options="store.dataBitsOptions"
            :stop-bits="settings.stopBits"
            :stop-bits-options="store.stopBitsOptions"
            :parity="settings.parity"
            :parity-options="store.parityOptions"
            :can-connect="canConnect"
            :can-disconnect="canDisconnect"
            :busy="connectionState === 'connecting' || connectionState === 'disconnecting'"
            @choose-port="store.choosePort"
            @update:baud-rate="store.updateBaudRate"
            @update:data-bits="store.updateDataBits"
            @update:stop-bits="store.updateStopBits"
            @update:parity="store.updateParity"
            @update:theme="selectedTheme = $event"
            @connect="store.connect"
            @disconnect="store.disconnect"
          />
        </div>

        <div class="space-y-4 p-4">
          <div class="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
        </div>
      </main>
    </div>
  </div>
</template>
