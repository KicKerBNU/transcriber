import type { RouteRecordRaw } from 'vue-router'

export const sessionRoutes: RouteRecordRaw[] = [
  {
    path: '/session',
    name: 'session',
    component: () => import('./session.vue'),
  },
]
