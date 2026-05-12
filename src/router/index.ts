import { createRouter, createWebHistory } from 'vue-router'
import { homeRoutes } from '@/modules/home/home.routes'
import { authRoutes } from '@/modules/auth/auth.routes'
import { dashboardRoutes } from '@/modules/dashboard/dashboard.routes'
import { sessionRoutes } from '@/modules/session/session.routes'
import { useAuthStore } from '@/modules/auth/store/auth.store'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...homeRoutes, ...authRoutes, ...dashboardRoutes, ...sessionRoutes],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  // Auth is always ready here — main.ts awaits init() before registering the router
  const isPublic = to.meta.public === true

  if (!isPublic && !authStore.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && authStore.user) {
    return { name: 'dashboard' }
  }
})
