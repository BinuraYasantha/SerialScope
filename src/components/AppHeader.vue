<script setup lang="ts">
import type { AppThemeId, AppThemeOption } from '../themes/appThemes'
import type { SerialParity } from '../types/serial.types'

defineProps<{
  portLabel: string
  connectionState: 'unsupported' | 'idle' | 'port-selected' | 'connecting' | 'connected' | 'disconnecting'
  selectedTheme: AppThemeId
  themes: AppThemeOption[]
  baudRate: number
  baudRates: number[]
  dataBits: 7 | 8
  dataBitsOptions: readonly (7 | 8)[]
  stopBits: 1 | 2
  stopBitsOptions: readonly (1 | 2)[]
  parity: SerialParity
  parityOptions: readonly SerialParity[]
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
  'update:theme': [value: AppThemeId]
  connect: []
  disconnect: []
}>()
</script>

<template>
  <header class="tool-panel px-4 py-3">
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="tool-button tool-button-secondary" :disabled="busy" @click="emit('choose-port')">Select Port</button>
      <button
        v-if="connectionState === 'connected' || connectionState === 'disconnecting'"
        type="button"
        class="tool-button tool-button-danger"
        :disabled="!canDisconnect"
        @click="emit('disconnect')"
      >
        {{ connectionState === 'disconnecting' ? 'Disconnecting...' : 'Disconnect' }}
      </button>
      <button
        v-else
        type="button"
        class="tool-button tool-button-primary"
        :disabled="!canConnect"
        @click="emit('connect')"
      >
        {{ connectionState === 'connecting' ? 'Connecting...' : 'Connect' }}
      </button>

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

      <div class="min-w-[10rem] flex-1 truncate text-sm">
        <div class="flex items-center gap-2">
          <span
            class="inline-flex h-2 w-2 shrink-0 rounded-full"
            :class="connectionState === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'"
          />
          <span class="app-muted-text truncate">{{ portLabel }}</span>
        </div>
      </div>

      <label class="floating-field min-w-[11rem]">
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
  </header>
</template>
