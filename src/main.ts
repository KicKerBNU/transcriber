import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/styles/main.css'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { registerFontAwesome } from './plugins/fontawesome'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

registerFontAwesome(app)

app.mount('#app')
