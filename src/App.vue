<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from './components/AppHeader.vue'
import SerialCommandInput from './components/SerialCommandInput.vue'
import SerialMonitorOutput from './components/SerialMonitorOutput.vue'
import ToastStack from './components/ToastStack.vue'
import type { ToastItem, ToastTone } from './components/ToastStack.vue'
import { useSerialStore } from './stores/serial.store'

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

const sectionItems = ['Serial Monitor', 'Device Info', 'Partitions', 'Apps', 'NVS Inspector', 'Flash Tools', 'Session Log', 'About']
const resourceItems = ['Tutorial', 'Buy Me a Coffee', 'Get Help']
const toasts = ref<ToastItem[]>([])
const unsupportedToastShown = ref(false)

onMounted(() => {
  void store.initialize()
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
</script>

<template>
  <div class="min-h-screen bg-[#111111] text-slate-200">
    <ToastStack :toasts="toasts" @close="removeToast" />

    <div class="grid min-h-screen lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside class="border-r border-slate-800 bg-[#212121]">
        <div class="px-4 py-4">
          <div class="text-xl font-semibold text-slate-100">ESPConnect</div>
          <div class="mt-1 text-sm text-slate-400">v1.1.14</div>
        </div>

        <div class="border-t border-slate-800 px-3 py-4">
          <div class="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sections</div>
          <nav class="mt-3 space-y-1">
            <button
              v-for="item in sectionItems"
              :key="item"
              type="button"
              class="sidebar-item"
              :class="{ 'sidebar-item-active': item === 'Serial Monitor' }"
            >
              <span class="sidebar-item-icon">{{ item === 'Serial Monitor' ? '>_' : '•' }}</span>
              <span>{{ item }}</span>
            </button>
          </nav>
        </div>

        <div class="border-t border-slate-800 px-3 py-4">
          <div class="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resources</div>
          <nav class="mt-3 space-y-1">
            <button v-for="item in resourceItems" :key="item" type="button" class="sidebar-item">
              <span class="sidebar-item-icon">•</span>
              <span>{{ item }}</span>
            </button>
          </nav>
        </div>
      </aside>

      <main class="min-w-0">
        <div class="border-b border-slate-800 bg-[#202020] px-4 py-3">
          <AppHeader
            :port-label="selectedPortLabel"
            :status-label="statusLabel"
            :status-tone="statusTone"
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
          <div class="space-y-4">
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
