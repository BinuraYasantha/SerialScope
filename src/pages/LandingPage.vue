<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE_PATH,
  absoluteSiteUrl,
  buildSoftwareApplicationSchema,
} from '../config/site'
import { useAppStore } from '../stores/app.store'

const router = useRouter()
const appStore = useAppStore()
const { selectedTheme } = storeToRefs(appStore)

useHead({
  title: `${SITE_NAME} - Browser-Based Serial Monitor for USB Devices`,
  meta: [
    {
      name: 'description',
      content: SITE_DESCRIPTION,
    },
    {
      name: 'keywords',
      content:
        'serial monitor, web serial, usb serial, browser serial terminal, embedded tools, serial console, serialscope',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      name: 'application-name',
      content: SITE_NAME,
    },
    {
      property: 'og:site_name',
      content: SITE_NAME,
    },
    {
      property: 'og:title',
      content: `${SITE_NAME} - Browser-Based Serial Monitor for USB Devices`,
    },
    {
      property: 'og:description',
      content:
        'Connect to USB serial devices directly from your browser, inspect live logs, send commands, and manage reusable XML command presets.',
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:url',
      content: absoluteSiteUrl('/'),
    },
    {
      property: 'og:image',
      content: absoluteSiteUrl(SITE_OG_IMAGE_PATH),
    },
    {
      property: 'og:image:alt',
      content: 'SerialScope browser-based serial monitor preview',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: `${SITE_NAME} - Browser-Based Serial Monitor for USB Devices`,
    },
    {
      name: 'twitter:description',
      content: 'A clean browser-based serial monitor with live output, XML command presets, and Web Serial support.',
    },
    {
      name: 'twitter:image',
      content: absoluteSiteUrl(SITE_OG_IMAGE_PATH),
    },
    {
      name: 'twitter:image:alt',
      content: 'SerialScope browser-based serial monitor preview',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: absoluteSiteUrl('/'),
    },
  ],
  script: [
    {
      key: 'serialscope-schema',
      type: 'application/ld+json',
      textContent: JSON.stringify(buildSoftwareApplicationSchema()),
    },
  ],
})

async function openApplication() {
  await router.push({ name: 'monitor' })
}
</script>

<template>
  <HomePage :selected-theme="selectedTheme" @update:theme="appStore.setTheme" @open-monitor="openApplication" />
</template>
