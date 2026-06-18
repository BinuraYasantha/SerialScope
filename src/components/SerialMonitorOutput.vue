<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { MonitorEntry } from '../types/serial.types'

const props = defineProps<{
  entries: MonitorEntry[]
  autoScroll: boolean
  paused: boolean
  queuedChunkCount: number
  rxBytes: number
  timestampsEnabled: boolean
  searchQuery: string
  totalVisibleLines: number
  txBytes: number
}>()

const emit = defineEmits<{
  clear: []
  copy: []
  download: []
  'toggle-auto-scroll': []
  'toggle-pause': []
  'toggle-timestamps': []
  'update:search-query': [value: string]
}>()

const viewport = ref<HTMLElement | null>(null)

const emptyMessage = computed(() => {
  if (props.searchQuery.trim()) {
    return 'No serial lines match the current filter.'
  }

  return 'Connect to a device to start receiving serial output.'
})

watch(
  () => props.entries.length,
  async () => {
    if (!props.autoScroll || !viewport.value) {
      return
    }

    await nextTick()
    viewport.value.scrollTop = viewport.value.scrollHeight
  },
)
</script>

<template>
  <section class="tool-panel flex h-[30rem] min-h-[30rem] max-h-[30rem] flex-col lg:h-[36rem] lg:min-h-[36rem] lg:max-h-[36rem]">
    <div class="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="text-sm font-medium text-slate-200">Serial Output</div>

      <div class="flex flex-1 flex-col gap-3 lg:max-w-3xl lg:flex-row lg:items-center">
        <label class="relative flex-1">
          <span class="sr-only">Filter serial log</span>
          <input
            :value="searchQuery"
            type="text"
            placeholder="Search or filter output"
            class="monitor-input pl-10"
            @input="emit('update:search-query', ($event.target as HTMLInputElement).value)"
          />
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" stroke-linecap="round" />
          </svg>
        </label>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="monitor-chip" :class="{ 'monitor-chip-active': autoScroll }" @click="emit('toggle-auto-scroll')">Auto-scroll</button>
          <button type="button" class="monitor-chip" :class="{ 'monitor-chip-active': timestampsEnabled }" @click="emit('toggle-timestamps')">Timestamps</button>
          <button type="button" class="monitor-chip" :class="{ 'monitor-chip-active': paused }" @click="emit('toggle-pause')">
            {{ paused ? 'Resume' : 'Pause' }}
          </button>
          <button type="button" class="monitor-chip" @click="emit('copy')">Copy</button>
          <button type="button" class="monitor-chip" @click="emit('download')">Download</button>
          <button type="button" class="monitor-chip" @click="emit('clear')">Clear</button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-2 text-xs text-slate-500">
      <div class="flex flex-wrap items-center gap-3">
        <span>{{ totalVisibleLines }} visible lines</span>
        <span>RX {{ rxBytes.toLocaleString() }} bytes</span>
        <span>TX {{ txBytes.toLocaleString() }} bytes</span>
        <span v-if="paused && queuedChunkCount" class="rounded border border-amber-800 bg-amber-950/40 px-2 py-1 text-amber-300">
          {{ queuedChunkCount }} chunk{{ queuedChunkCount === 1 ? '' : 's' }} buffered
        </span>
      </div>
    </div>

    <div ref="viewport" class="serial-viewport min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
      <div v-if="entries.length" class="space-y-1.5">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="grid gap-2 rounded border px-3 py-2 text-sm lg:grid-cols-[6rem_3rem_minmax(0,1fr)]"
          :class="{
            'border-slate-800 bg-slate-950 text-slate-200': entry.direction === 'rx' || entry.direction === 'system',
            'border-slate-700 bg-slate-900 text-slate-100': entry.direction === 'tx',
            'opacity-70': !entry.complete,
          }"
        >
          <div class="font-mono text-xs tracking-wide text-slate-500">
            <span v-if="timestampsEnabled">{{ entry.timestampLabel }}</span>
            <span v-else>--:--:--</span>
          </div>
          <div class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{{ entry.direction }}</div>
          <pre class="serial-pre">{{ entry.text || ' ' }}</pre>
        </div>
      </div>

      <div v-else class="flex h-full min-h-64 items-center justify-center">
        <div class="w-full max-w-sm rounded-xl bg-[#3b3b3b] px-8 py-12 text-center text-sm leading-6 text-slate-100">
          <div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded bg-[#4a4a4a] text-lg text-slate-200">⌁</div>
          <div class="text-xl font-semibold text-white">No device connected</div>
          <div class="mt-2 text-sm text-slate-200">{{ emptyMessage }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
