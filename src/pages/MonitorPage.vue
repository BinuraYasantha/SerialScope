<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import SerialCommandInput from '../components/SerialCommandInput.vue'
import SerialMonitorOutput from '../components/SerialMonitorOutput.vue'
import ToastStack from '../components/ToastStack.vue'
import type { ToastItem, ToastTone } from '../components/ToastStack.vue'
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_PATH, absoluteSiteUrl } from '../config/site'
import { useAppStore } from '../stores/app.store'
import { useSerialStore } from '../stores/serial.store'
import { APP_THEMES } from '../themes/appThemes'

const router = useRouter()
const appStore = useAppStore()
const serialStore = useSerialStore()
const { selectedTheme } = storeToRefs(appStore)
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
  settings,
  supportMessage,
  supported,
  timestampsEnabled,
  totalVisibleLines,
  txBytes,
  uiNotice,
} = storeToRefs(serialStore)

const toasts = ref<ToastItem[]>([])
const unsupportedToastShown = ref(false)
const lastConnectionState = ref(connectionState.value)

useHead({
  title: `${SITE_NAME} App - Browser Serial Monitor`,
  meta: [
    {
      name: 'description',
      content:
        'Use the SerialScope serial monitor app to connect to USB serial devices, inspect live logs, and send commands from your browser.',
    },
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
    {
      property: 'og:title',
      content: `${SITE_NAME} App - Browser Serial Monitor`,
    },
    {
      property: 'og:description',
      content: SITE_DESCRIPTION,
    },
    {
      property: 'og:url',
      content: absoluteSiteUrl('/app'),
    },
    {
      property: 'og:image',
      content: absoluteSiteUrl(SITE_OG_IMAGE_PATH),
    },
    {
      name: 'twitter:title',
      content: `${SITE_NAME} App - Browser Serial Monitor`,
    },
    {
      name: 'twitter:description',
      content:
        'Use the SerialScope serial monitor app to connect to USB serial devices, inspect live logs, and send commands from your browser.',
    },
    {
      name: 'twitter:image',
      content: absoluteSiteUrl(SITE_OG_IMAGE_PATH),
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: absoluteSiteUrl('/app'),
    },
  ],
})

onMounted(() => {
  void serialStore.initialize()
})

watch(errorMessage, (message) => {
  if (!message) {
    return
  }

  addToast('error', message, 4200)
  serialStore.clearError()
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

watch(connectionState, (state) => {
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
  if (!notice) {
    return
  }

  addToast(notice.tone, notice.message, 2600)
  serialStore.clearUiNotice()
})

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(serialStore.buildLogText())
    addToast('success', 'Copied visible serial output to the clipboard.', 2200)
  } catch {
    addToast('error', 'Clipboard access failed. Use download instead.', 3200)
  }
}

function downloadLog() {
  const blob = new Blob([serialStore.buildLogText()], { type: 'text/plain;charset=utf-8' })
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

async function openLandingPage() {
  await router.push({ name: 'landing' })
}
</script>

<template>
  <div class="app-shell min-h-screen">
    <ToastStack :toasts="toasts" @close="removeToast" />

    <div class="grid min-h-screen lg:grid-cols-[16rem_minmax(0,1fr)]">
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
            <button type="button" class="sidebar-item">
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
              <span>Tutorial</span>
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
            :baud-rates="serialStore.baudRates"
            :data-bits="settings.dataBits"
            :data-bits-options="serialStore.dataBitsOptions"
            :stop-bits="settings.stopBits"
            :stop-bits-options="serialStore.stopBitsOptions"
            :parity="settings.parity"
            :parity-options="serialStore.parityOptions"
            :can-connect="canConnect"
            :can-disconnect="canDisconnect"
            :busy="connectionState === 'connecting' || connectionState === 'disconnecting'"
            @choose-port="serialStore.choosePort"
            @update:baud-rate="serialStore.updateBaudRate"
            @update:data-bits="serialStore.updateDataBits"
            @update:stop-bits="serialStore.updateStopBits"
            @update:parity="serialStore.updateParity"
            @update:theme="appStore.setTheme"
            @connect="serialStore.connect"
            @disconnect="serialStore.disconnect"
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
              @clear="serialStore.clearOutput"
              @copy="copyOutput"
              @download="downloadLog"
              @toggle-auto-scroll="serialStore.toggleAutoScroll"
              @toggle-pause="serialStore.togglePause"
              @toggle-timestamps="serialStore.toggleTimestamps"
              @update:search-query="serialStore.setSearchQuery"
            />

            <SerialCommandInput />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
