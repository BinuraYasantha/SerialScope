<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSerialStore } from '../stores/serial.store'

const store = useSerialStore()
const {
  canSavePreset,
  commandInput,
  commandPresets,
  connectionState,
  editingPresetId,
  isEditingPreset,
  lineEnding,
  presetNameInput,
  savePresetLabel,
} = storeToRefs(store)

const fileInput = ref<HTMLInputElement | null>(null)

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

function openImportPicker() {
  fileInput.value?.click()
}

async function handleImportChange(event: Event) {
  const input = event.target as HTMLInputElement
  const [file] = Array.from(input.files ?? [])

  if (!file) {
    return
  }

  const xmlText = await file.text()
  await store.importCommandPresetsFromXml(xmlText)
  input.value = ''
}

function exportPresets() {
  const xmlText = store.exportCommandPresetsToXml()
  if (!xmlText) {
    return
  }

  const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'serialscope-command-presets.xml'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="tool-panel flex h-[38rem] min-h-[38rem] max-h-[38rem] flex-col lg:h-[49rem] lg:min-h-[49rem] lg:max-h-[49rem]">
    <div class="panel-divider border-b px-4 py-4">
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <input
            v-model="commandInput"
            type="text"
            placeholder="Type a serial command and press Enter"
            class="monitor-input flex-1 font-mono text-sm"
            @keydown="handleKeydown"
          />

          <select
            v-model="lineEnding"
            class="monitor-select w-auto min-w-[6.5rem] max-w-[6.5rem] shrink-0 py-2 text-sm"
            title="Line ending"
          >
            <option value="none">None</option>
            <option value="newline">\n</option>
            <option value="carriage-return">\r</option>
            <option value="crlf">\r\n</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model="presetNameInput"
            type="text"
            class="monitor-input flex-1 text-sm"
            placeholder="Preset name"
            title="Name used when saving or updating the current command preset"
          />

          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-secondary-bg)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-secondary-hover)]"
            :disabled="!canSavePreset"
            :title="savePresetLabel"
            @click="store.saveCurrentCommandPreset"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 21h14" />
              <path d="M19 21V7l-3-3H8L5 7v14" />
              <path d="M9 21v-6h6v6" />
              <path d="M9 4v5h6" />
            </svg>
            <span class="sr-only">{{ savePresetLabel }}</span>
          </button>

          <button
            v-if="isEditingPreset"
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-secondary-bg)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-secondary-hover)]"
            title="Cancel preset editing"
            @click="store.cancelEditCommandPreset"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
            <span class="sr-only">Cancel Edit</span>
          </button>

          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-secondary-bg)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-secondary-hover)]"
            title="Import command presets from an XCTU-style XML file"
            @click="openImportPicker"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            <span class="sr-only">Import XML</span>
          </button>

          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-secondary-bg)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-secondary-hover)]"
            :disabled="commandPresets.length === 0"
            title="Export all saved presets to an XCTU-style XML file"
            @click="exportPresets"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 21V9" />
              <path d="m7 14 5-5 5 5" />
              <path d="M5 3h14" />
            </svg>
            <span class="sr-only">Export XML</span>
          </button>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept=".xml,text/xml,application/xml"
        class="hidden"
        @change="handleImportChange"
      />
    </div>

    <div class="panel-divider flex items-center justify-between gap-3 border-b px-4 py-3">
      <div>
        <div class="app-section-label text-[11px] font-semibold uppercase tracking-[0.18em]">Command Library</div>
        <div class="app-muted-text mt-1 text-sm">{{ commandPresets.length }} saved packet{{ commandPresets.length === 1 ? '' : 's' }}</div>
      </div>

      <button
        type="button"
        class="command-action-button command-action-button-danger h-8 w-8"
        :disabled="commandPresets.length === 0"
        title="Remove all saved command presets"
        @click="store.clearAllCommandPresets"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
        <span class="sr-only">Clear All</span>
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div v-if="commandPresets.length" class="overflow-hidden rounded-lg border border-[var(--color-border)]">
        <button
          v-for="preset in commandPresets"
          :key="preset.id"
          type="button"
          class="group flex w-full items-center gap-3 border-b border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-panel-bg)_92%,black)] px-3 py-3 text-left transition hover:bg-[color:color-mix(in_srgb,var(--color-panel-bg)_100%,white_4%)] last:border-b-0"
          :class="{ 'bg-[color:color-mix(in_srgb,var(--color-primary-soft)_78%,var(--color-panel-bg))]': editingPresetId === preset.id }"
          @click="store.loadCommandPreset(preset.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <div class="app-title-text truncate text-sm font-semibold">{{ preset.name }}</div>
              <span class="shrink-0 rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                {{ preset.source === 'imported' ? 'XML' : 'Manual' }}
              </span>
            </div>
            <div class="app-muted-text mt-1 truncate font-mono text-xs">
              {{ preset.commandText || '[Binary packet]' }}
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="command-action-button command-action-button-send h-8 w-8 opacity-0 group-hover:opacity-100"
              title="Send preset"
              :disabled="connectionState !== 'connected'"
              @click.stop="store.sendCommandPreset(preset.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4Z" />
              </svg>
              <span class="sr-only">Send preset</span>
            </button>
            <button
              type="button"
              class="command-action-button h-8 w-8"
              title="Edit preset"
              @click.stop="store.beginEditCommandPreset(preset.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <span class="sr-only">Edit preset</span>
            </button>
            <button
              type="button"
              class="command-action-button command-action-button-danger h-8 w-8"
              title="Remove preset"
              @click.stop="store.deleteCommandPreset(preset.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
              <span class="sr-only">Remove preset</span>
            </button>
          </div>
        </button>
      </div>

      <div v-else class="flex h-full min-h-52 items-center justify-center px-4 text-center">
        <div>
          <div class="app-title-text text-base font-semibold">No saved command presets</div>
          <div class="app-muted-text mt-2 text-sm">
            Save the current command or import an XCTU-style XML file to build your command library.
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
