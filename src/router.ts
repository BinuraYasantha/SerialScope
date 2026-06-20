import type { RouteRecordRaw } from 'vue-router'
import LandingPage from './pages/LandingPage.vue'
import MonitorPage from './pages/MonitorPage.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: LandingPage,
  },
  {
    path: '/app',
    name: 'monitor',
    component: MonitorPage,
  },
]

export const routerOptions = {
  routes,
  scrollBehavior(_to: unknown, _from: unknown, savedPosition: { left: number; top: number } | null) {
    return savedPosition ?? { left: 0, top: 0 }
  },
}
