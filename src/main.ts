import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/styles/main.css'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { registerFontAwesome } from './plugins/fontawesome'
import { useAuthStore } from './modules/auth/store/auth.store'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Resolve Firebase auth state before the router starts navigating.
// This guarantees the guard never runs with user=null due to a cold start.
const authStore = useAuthStore()
await authStore.init()

app.use(router)
app.use(i18n)

registerFontAwesome(app)

app.mount('#app')
