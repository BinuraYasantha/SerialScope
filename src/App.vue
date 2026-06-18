<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from './components/AppHeader.vue'
import SerialCommandInput from './components/SerialCommandInput.vue'
import SerialMonitorOutput from './components/SerialMonitorOutput.vue'
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
  supported,
  settings,
  timestampsEnabled,
  totalVisibleLines,
  txBytes,
} = storeToRefs(store)

const feedbackMessage = ref('')
const sectionItems = ['Serial Monitor', 'Device Info', 'Partitions', 'Apps', 'NVS Inspector', 'Flash Tools', 'Session Log', 'About']
const resourceItems = ['Tutorial', 'Buy Me a Coffee', 'Get Help']

const supportBanner = computed(() => {
  if (supported.value) {
    return ''
  }

  return 'This browser does not expose the Web Serial API. Open the app in Chrome, Edge, or another Chromium-based browser over localhost or HTTPS.'
})

onMounted(() => {
  void store.initialize()
})

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(store.buildLogText())
    feedbackMessage.value = 'Copied visible serial output to the clipboard.'
    window.setTimeout(() => {
      feedbackMessage.value = ''
    }, 2200)
  } catch {
    feedbackMessage.value = 'Clipboard access failed. Use download instead.'
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
  feedbackMessage.value = 'Downloaded the current serial log.'
  window.setTimeout(() => {
    feedbackMessage.value = ''
  }, 2200)
}
</script>

<template>
  <div class="min-h-screen bg-[#111111] text-slate-200">
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
          <div
            v-if="supportBanner"
            class="rounded border border-rose-900 bg-rose-950/50 px-4 py-3 text-sm text-rose-100"
          >
            {{ supportBanner }}
          </div>

          <div
            v-if="errorMessage"
            class="rounded border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
          >
            {{ errorMessage }}
          </div>

          <div
            v-if="feedbackMessage"
            class="rounded border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
          >
            {{ feedbackMessage }}
          </div>

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
