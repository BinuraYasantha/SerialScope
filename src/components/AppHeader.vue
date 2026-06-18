<script setup lang="ts">
import type { SerialFlowControl, SerialParity } from '../types/serial.types'

defineProps<{
  portLabel: string
  statusLabel: string
  statusTone: string
  baudRate: number
  baudRates: number[]
  dataBits: 7 | 8
  dataBitsOptions: readonly (7 | 8)[]
  stopBits: 1 | 2
  stopBitsOptions: readonly (1 | 2)[]
  parity: SerialParity
  parityOptions: readonly SerialParity[]
  flowControl: SerialFlowControl
  flowControlOptions: readonly SerialFlowControl[]
  canConnect: boolean
  canDisconnect: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  'choose-port': []
  'update:baud-rate': [value: number]
  'update:data-bits': [value: 7 | 8]
  'update:stop-bits': [value: 1 | 2]
  'update:parity': [value: SerialParity]
  'update:flow-control': [value: SerialFlowControl]
  connect: []
  disconnect: []
}>()
</script>

<template>
  <header class="tool-panel px-4 py-3">
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="tool-button tool-button-secondary" :disabled="busy" @click="emit('choose-port')">Select Port</button>
      <button type="button" class="tool-button tool-button-primary" :disabled="!canConnect" @click="emit('connect')">Connect</button>
      <button type="button" class="tool-button tool-button-danger" :disabled="!canDisconnect" @click="emit('disconnect')">Disconnect</button>

      <label class="floating-field min-w-[10rem]">
        <span class="floating-field-label">Baud rate</span>
        <select
          :value="baudRate"
          class="monitor-select floating-select"
          :disabled="busy"
          @change="emit('update:baud-rate', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="rate in baudRates" :key="rate" :value="rate">{{ rate }} baud</option>
        </select>
      </label>

      <label class="floating-field min-w-[7rem]">
        <span class="floating-field-label">Data Bits</span>
        <select
          :value="dataBits"
          class="monitor-select floating-select"
          :disabled="busy"
          @change="emit('update:data-bits', Number(($event.target as HTMLSelectElement).value) as 7 | 8)"
        >
          <option v-for="value in dataBitsOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>

      <label class="floating-field min-w-[7rem]">
        <span class="floating-field-label">Stop Bits</span>
        <select
          :value="stopBits"
          class="monitor-select floating-select"
          :disabled="busy"
          @change="emit('update:stop-bits', Number(($event.target as HTMLSelectElement).value) as 1 | 2)"
        >
          <option v-for="value in stopBitsOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>

      <label class="floating-field min-w-[8rem]">
        <span class="floating-field-label">Parity</span>
        <select
          :value="parity"
          class="monitor-select floating-select"
          :disabled="busy"
          @change="emit('update:parity', ($event.target as HTMLSelectElement).value as SerialParity)"
        >
          <option v-for="value in parityOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>

      <label class="floating-field min-w-[10rem]">
        <span class="floating-field-label">Flow Control</span>
        <select
          :value="flowControl"
          class="monitor-select floating-select"
          :disabled="busy"
          @change="emit('update:flow-control', ($event.target as HTMLSelectElement).value as SerialFlowControl)"
        >
          <option v-for="value in flowControlOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>

      <div class="min-w-[10rem] flex-1 truncate text-sm text-slate-400">{{ portLabel }}</div>

      <div
        class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
        :class="{
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-300': statusTone === 'emerald',
          'border-amber-500/40 bg-amber-500/10 text-amber-300': statusTone === 'amber',
          'border-sky-500/40 bg-sky-500/10 text-sky-300': statusTone === 'sky',
          'border-rose-500/40 bg-rose-500/10 text-rose-300': statusTone === 'rose',
          'border-slate-600 bg-slate-800 text-slate-300': statusTone === 'slate',
        }"
      >
        <span class="inline-flex h-2 w-2 rounded-full bg-current" />
        {{ statusLabel }}
      </div>
    </div>
  </header>
</template>
