import type { Preview, App } from '@storybook/vue3-vite'
import { createPinia } from 'pinia'
import { i18n } from '../src/i18n'
import { registerFontAwesome } from '../src/plugins/fontawesome'
import '../src/assets/styles/main.css'

const preview: Preview = {
  decorators: [
    (story, context) => ({
      setup() {
        return { story, context }
      },
      template: '<story />',
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
}

export const setup = (app: App) => {
  app.use(createPinia())
  app.use(i18n)
  registerFontAwesome(app)
}

export default preview
