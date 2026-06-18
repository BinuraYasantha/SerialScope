<script setup lang="ts">
defineProps<{
  portLabel: string
}>()
</script>

<template>
  <section class="tool-panel p-5">
    <div class="space-y-2">
      <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">Device Info</div>
      <h2 class="app-title-text text-2xl font-semibold">Selected Device</h2>
      <p class="app-muted-text text-sm">Web Serial exposes limited device metadata in the browser, so this view shows the selected device label currently available to the app.</p>
    </div>

    <div class="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-console-bg)] px-4 py-4">
      <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">Port</div>
      <div class="app-title-text mt-2 text-lg font-medium">{{ portLabel }}</div>
    </div>
  </section>
</template>
