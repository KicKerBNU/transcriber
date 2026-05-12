import type { RouteRecordRaw } from 'vue-router'

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./dashboard.vue'),
  },
  {
    path: '/conversation/:id',
    name: 'conversation',
    component: () => import('./conversation.vue'),
  },
]
