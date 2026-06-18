<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSerialStore } from '../stores/serial.store'

const store = useSerialStore()
const { canSend, commandInput, connectionState, lineEnding } = storeToRefs(store)

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    store.stepHistory('up')
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    store.stepHistory('down')
    return
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void store.sendCommand()
  }
}
</script>

<template>
  <section class="tool-panel p-4">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end">
      <label class="flex-1 space-y-2">
        <span class="app-section-label text-[11px] font-semibold uppercase tracking-[0.18em]">Command</span>
        <textarea
          v-model="commandInput"
          rows="3"
          placeholder="Type a serial command and press Enter to send"
          class="monitor-input min-h-[7.5rem] resize-none py-3 font-mono text-sm"
          :disabled="connectionState !== 'connected'"
          @keydown="handleKeydown"
        />
      </label>

      <div class="grid gap-3 xl:w-72">
        <label class="space-y-2">
          <span class="app-section-label text-[11px] font-semibold uppercase tracking-[0.18em]">Line Ending</span>
          <select v-model="lineEnding" class="monitor-select" :disabled="connectionState !== 'connected'">
            <option value="none">No line ending</option>
            <option value="newline">New line \n</option>
            <option value="carriage-return">Carriage return \r</option>
            <option value="crlf">Both \r\n</option>
          </select>
        </label>

        <button
          type="button"
          class="tool-button tool-button-primary"
          :disabled="!canSend"
          @click="store.sendCommand"
        >
          Send Command
        </button>
      </div>
    </div>
  </section>
</template>
