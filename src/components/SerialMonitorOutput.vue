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
  <section class="tool-panel flex h-[38rem] min-h-[38rem] max-h-[38rem] flex-col lg:h-[49rem] lg:min-h-[49rem] lg:max-h-[49rem]">
    <div class="panel-divider flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="app-title-text text-sm font-medium">Serial Output</div>

      <div class="flex flex-1 flex-col gap-3 lg:max-w-3xl lg:flex-row lg:items-center">
        <label class="relative flex-1">
          <span class="sr-only">Filter serial log</span>
          <input
            :value="searchQuery"
            type="text"
            placeholder="Search or filter output"
            class="monitor-input"
            @input="emit('update:search-query', ($event.target as HTMLInputElement).value)"
          />
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

    <div class="panel-divider app-subtle-text flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 text-xs">
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
          class="serial-entry grid gap-2 rounded border px-3 py-2 text-sm lg:grid-cols-[6rem_5rem_minmax(0,1fr)]"
          :class="{
            'serial-entry-rx': entry.direction === 'rx',
            'serial-entry-tx': entry.direction === 'tx',
            'serial-entry-system': entry.direction === 'system',
            'opacity-70': !entry.complete,
          }"
        >
          <div class="app-subtle-text font-mono text-xs tracking-wide">
            <span v-if="timestampsEnabled">{{ entry.timestampLabel }}</span>
            <span v-else>--:--:--</span>
          </div>
          <div>
            <span
              class="serial-direction-badge"
              :class="{
                'serial-direction-badge-rx': entry.direction === 'rx',
                'serial-direction-badge-tx': entry.direction === 'tx',
                'serial-direction-badge-system': entry.direction === 'system',
              }"
            >
              {{ entry.direction }}
            </span>
          </div>
          <pre class="serial-pre">{{ entry.text || ' ' }}</pre>
        </div>
      </div>

      <div v-else class="flex h-full min-h-64 items-center justify-center">
        <div class="serial-empty-card w-full max-w-sm rounded-xl px-8 py-12 text-center text-sm leading-6">
          <div class="serial-empty-icon mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl">
            <svg viewBox="0 0 64 64" class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M24 14h16v18h6a4 4 0 0 1 4 4v9a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5v-9a4 4 0 0 1 4-4h6V14Z" />
              <path d="M24 23h16" opacity="0.55" />
              <path d="M28 50v4M36 50v4" />
              <path d="m21 19 22 22" />
            </svg>
          </div>
          <div class="app-title-text text-xl font-semibold">No device connected</div>
          <div class="app-muted-text mt-2 text-sm">{{ emptyMessage }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
