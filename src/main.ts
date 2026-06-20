import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routerOptions } from './router'
import { useAppStore } from './stores/app.store'
import './style.css'

export const createApp = ViteSSG(App, routerOptions, ({ app, initialState }) => {
  const pinia = createPinia()

  app.use(pinia)

  if (import.meta.env.SSR) {
    initialState.pinia = pinia.state.value
    return
  }

  pinia.state.value = initialState.pinia || {}
  useAppStore(pinia).initializeTheme()
})
