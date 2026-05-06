import { createRouter, createWebHistory } from 'vue-router'
import { homeRoutes } from '@/modules/home/home.routes'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...homeRoutes],
})
