<script setup lang="ts">
import type { AppThemeId } from '../themes/appThemes'

defineProps<{
  selectedTheme: AppThemeId
}>()

const emit = defineEmits<{
  'update:theme': [value: AppThemeId]
  'open-monitor': []
}>()
</script>

<template>
  <div class="relative min-h-screen overflow-hidden app-shell">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%)]"></div>
    <div class="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:32px_32px]"></div>

    <div class="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header class="tool-panel px-4 py-3 sm:px-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-panel-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <svg viewBox="0 0 64 64" class="h-7 w-7" fill="none" aria-hidden="true">
                <rect x="8" y="8" width="48" height="48" rx="12" fill="#0F172A" />
                <rect x="8" y="8" width="48" height="48" rx="12" stroke="#38BDF8" stroke-width="3" />
                <path d="M22 25 30 32 22 39" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M36 39H44" stroke="#E0F2FE" stroke-width="5" stroke-linecap="round" />
              </svg>
            </span>
            <div>
              <div class="app-title-text text-xl font-semibold">SerialScope</div>
              <div class="app-muted-text mt-1 text-sm">Web serial monitor for modern embedded workflows</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <label class="floating-field min-w-[11rem]">
              <span class="floating-field-label">Preview Theme</span>
              <select
                :value="selectedTheme"
                class="monitor-select floating-select"
                @change="emit('update:theme', ($event.target as HTMLSelectElement).value as AppThemeId)"
              >
                <option value="paper-sky">Paper + Sky</option>
                <option value="slate-blue">Slate + Blue</option>
                <option value="charcoal-emerald">Charcoal + Emerald</option>
                <option value="graphite-cyan">Graphite + Cyan</option>
                <option value="navy-amber">Deep Navy + Amber</option>
                <option value="stone-indigo">Stone + Indigo</option>
              </select>
            </label>
            <button type="button" class="tool-button tool-button-primary" @click="emit('open-monitor')">Try Now</button>
          </div>
        </div>
      </header>

      <main class="flex-1 py-6 lg:py-8">
        <section class="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(23rem,0.92fr)] lg:items-stretch">
          <div class="tool-panel px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div class="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-panel-bg)_80%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] app-section-label">
              Browser-Based Serial Monitor
            </div>

            <h1 class="app-title-text mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              A clean serial console for USB devices, right in your browser.
            </h1>

            <p class="app-muted-text mt-5 max-w-3xl text-base leading-8 sm:text-lg">
              SerialScope helps developers, test engineers, and hardware teams connect to USB serial devices, inspect
              real-time logs, send commands, and reuse saved XML command presets without installing a desktop terminal.
            </p>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <button type="button" class="tool-button tool-button-primary px-5 py-3 text-sm" @click="emit('open-monitor')">
                Try Now
              </button>
              <a href="#features" class="tool-button tool-button-secondary inline-flex items-center justify-center px-5 py-3 no-underline">
                Explore Features
              </a>
            </div>

            <div class="mt-8 grid gap-3 sm:grid-cols-3">
              <article class="rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-console-bg)_80%,var(--color-panel-bg))] p-4">
                <div class="app-title-text text-lg font-semibold">Live Monitoring</div>
                <p class="app-muted-text mt-2 text-sm leading-6">Fixed-height serial logs with search, timestamps, copy, and download support.</p>
              </article>
              <article class="rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-console-bg)_80%,var(--color-panel-bg))] p-4">
                <div class="app-title-text text-lg font-semibold">Instant Commands</div>
                <p class="app-muted-text mt-2 text-sm leading-6">Send typed commands quickly and keep reusable preset libraries nearby.</p>
              </article>
              <article class="rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-console-bg)_80%,var(--color-panel-bg))] p-4">
                <div class="app-title-text text-lg font-semibold">XML Import</div>
                <p class="app-muted-text mt-2 text-sm leading-6">Bring existing XCTU-style XML packet definitions into a cleaner workflow.</p>
              </article>
            </div>
          </div>

          <div class="tool-panel overflow-hidden">
            <div class="border-b border-[var(--color-border)] px-5 py-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">Preview</div>
                  <div class="app-title-text mt-2 text-xl font-semibold">SerialScope Workspace</div>
                </div>
                <span class="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  <span class="inline-flex h-2 w-2 rounded-full bg-current"></span>
                  Ready on Chromium
                </span>
              </div>
            </div>

            <div class="space-y-4 p-5">
              <div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-topbar-bg)] p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="tool-button tool-button-secondary">Select Port</span>
                  <span class="tool-button tool-button-primary">Connect</span>
                  <span class="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] px-3 py-2 text-sm app-muted-text">921600 baud</span>
                  <span class="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] px-3 py-2 text-sm app-muted-text">8N1</span>
                </div>
              </div>

              <div class="rounded-xl border border-[var(--color-border)] serial-viewport p-4">
                <div class="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                  <div>
                    <div class="app-title-text text-sm font-semibold">Serial Output</div>
                    <div class="app-muted-text mt-1 text-xs">Real-time device messages with readable line handling.</div>
                  </div>
                  <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                    <span class="serial-direction-badge serial-direction-badge-rx">RX</span>
                    <span class="serial-direction-badge serial-direction-badge-tx">TX</span>
                  </div>
                </div>

                <div class="mt-4 space-y-2 font-mono text-sm leading-6">
                  <div class="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-console-bg)_84%,white_4%)] px-3 py-2">
                    <span class="serial-direction-badge serial-direction-badge-rx mr-3">RX</span>
                    <span class="app-muted-text">17:06:35.391</span>
                    <span class="app-title-text ml-3">boot: ready</span>
                  </div>
                  <div class="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-console-bg))] px-3 py-2">
                    <span class="serial-direction-badge serial-direction-badge-tx mr-3">TX</span>
                    <span class="app-muted-text">17:06:36.102</span>
                    <span class="app-title-text ml-3">AT+STATUS?</span>
                  </div>
                  <div class="rounded-lg border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-console-bg)_84%,white_4%)] px-3 py-2">
                    <span class="serial-direction-badge serial-direction-badge-rx mr-3">RX</span>
                    <span class="app-muted-text">17:06:36.120</span>
                    <span class="app-title-text ml-3">OK RSSI=-61 MODE=RUN</span>
                  </div>
                  <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-bg)] px-3 py-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="app-title-text text-sm font-semibold">Command Library</div>
                      <span class="app-muted-text text-xs">Import XML presets</span>
                    </div>
                    <div class="mt-3 grid gap-2">
                      <div class="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                        <span class="app-title-text">Read Firmware</span>
                        <span class="app-muted-text text-xs">Preset</span>
                      </div>
                      <div class="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                        <span class="app-title-text">Restart Module</span>
                        <span class="app-muted-text text-xs">Preset</span>
                      </div>
                      <div class="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                        <span class="app-title-text">Read Config</span>
                        <span class="app-muted-text text-xs">Preset</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" class="mt-6 grid gap-4 lg:grid-cols-3">
          <article class="tool-panel p-5">
            <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">Why It Fits</div>
            <h2 class="app-title-text mt-3 text-xl font-semibold">Built for embedded teams and device tools</h2>
            <p class="app-muted-text mt-3 text-sm leading-7">
              SerialScope focuses on the real workflow: connect to a port, watch clean live output, send commands fast,
              and keep repeatable serial presets available in one workspace.
            </p>
          </article>

          <article class="tool-panel p-5">
            <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">No Backend</div>
            <h2 class="app-title-text mt-3 text-xl font-semibold">Runs entirely on the client side</h2>
            <p class="app-muted-text mt-3 text-sm leading-7">
              The app uses the Web Serial API directly in the browser, so deployment stays lightweight while serial communication remains local to the user's machine.
            </p>
          </article>

          <article class="tool-panel p-5">
            <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">Reusable Workflows</div>
            <h2 class="app-title-text mt-3 text-xl font-semibold">Presets, histories, and faster command testing</h2>
            <p class="app-muted-text mt-3 text-sm leading-7">
              Use saved commands for repeated diagnostics, import packet libraries from XML, and move through serial test
              sessions with fewer manual steps.
            </p>
          </article>
        </section>

        <section class="mt-6 tool-panel px-6 py-8 sm:px-8">
          <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div class="app-section-label text-xs font-semibold uppercase tracking-[0.18em]">Get Started</div>
              <h2 class="app-title-text mt-3 text-3xl font-semibold">Open the app and start monitoring in seconds.</h2>
              <p class="app-muted-text mt-3 max-w-3xl text-sm leading-7">
                Use a Chromium-based browser, connect a USB serial device, and start reading logs directly in SerialScope.
                Your theme preference and serial settings stay remembered between sessions.
              </p>
            </div>
            <button type="button" class="tool-button tool-button-primary px-5 py-3 text-sm" @click="emit('open-monitor')">Try Now</button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>


