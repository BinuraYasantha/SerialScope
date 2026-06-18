<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSerialStore } from '../stores/serial.store'

const store = useSerialStore()
const {
  canConnect,
  canDisconnect,
  connectionState,
  selectedPortLabel,
  settings,
  supported,
} = storeToRefs(store)
</script>

<template>
  <section class="tool-panel p-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Connection</div>
        <h2 class="mt-2 text-base font-semibold text-slate-100">Port Settings</h2>
      </div>
      <div class="max-w-[9rem] truncate rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-400">{{ selectedPortLabel }}</div>
    </div>

    <div class="mt-4 space-y-4">
      <button
        type="button"
        class="tool-button tool-button-secondary w-full"
        :disabled="!supported || connectionState === 'connecting'"
        @click="store.choosePort"
      >
        Choose Serial Port
      </button>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="space-y-2">
          <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Baud Rate</span>
          <select v-model.number="settings.baudRate" class="monitor-select" :disabled="connectionState === 'connected' || connectionState === 'connecting'">
            <option v-for="rate in store.baudRates" :key="rate" :value="rate">{{ rate }}</option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Data Bits</span>
          <select v-model.number="settings.dataBits" class="monitor-select" :disabled="connectionState === 'connected' || connectionState === 'connecting'">
            <option v-for="value in store.dataBitsOptions" :key="value" :value="value">{{ value }}</option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Stop Bits</span>
          <select v-model.number="settings.stopBits" class="monitor-select" :disabled="connectionState === 'connected' || connectionState === 'connecting'">
            <option v-for="value in store.stopBitsOptions" :key="value" :value="value">{{ value }}</option>
          </select>
        </label>

        <label class="space-y-2">
          <span class="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Parity</span>
          <select v-model="settings.parity" class="monitor-select" :disabled="connectionState === 'connected' || connectionState === 'connecting'">
            <option v-for="value in store.parityOptions" :key="value" :value="value">{{ value }}</option>
          </select>
        </label>

      </div>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        class="tool-button tool-button-primary"
        :disabled="!canConnect"
        @click="store.connect"
      >
        Connect
      </button>
      <button
        type="button"
        class="tool-button tool-button-danger"
        :disabled="!canDisconnect"
        @click="store.disconnect"
      >
        Disconnect
      </button>
    </div>
  </section>
</template>
