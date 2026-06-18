<script setup lang="ts">
export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

defineProps<{
  toasts: ToastItem[]
}>()

const emit = defineEmits<{
  close: [id: string]
}>()
</script>

<template>
  <div class="pointer-events-none fixed right-5 top-5 z-50 flex w-[min(26rem,calc(100vw-2.5rem))] flex-col gap-3">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
        :class="{
          'border-emerald-700 bg-emerald-500 text-white': toast.tone === 'success',
          'border-rose-900 bg-rose-600 text-white': toast.tone === 'error',
          'border-slate-700 bg-slate-800 text-slate-100': toast.tone === 'info',
        }"
      >
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          :class="{
            'bg-white/20': toast.tone === 'success' || toast.tone === 'error',
            'bg-slate-700': toast.tone === 'info',
          }"
        >
          <span v-if="toast.tone === 'success'">✓</span>
          <span v-else-if="toast.tone === 'error'">!</span>
          <span v-else>i</span>
        </div>
        <div class="min-w-0 flex-1 text-sm font-medium">{{ toast.message }}</div>
        <button
          type="button"
          class="rounded p-1 text-lg leading-none text-current/90 transition hover:bg-white/10"
          @click="emit('close', toast.id)"
        >
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>
