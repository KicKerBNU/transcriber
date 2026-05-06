import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faBolt,
  faPalette,
  faDatabase,
  faRoute,
  faLayerGroup,
  faCode,
  faBook,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons'
import type { App } from 'vue'

library.add(faBolt, faPalette, faDatabase, faRoute, faLayerGroup, faCode, faBook, faGlobe)

export function registerFontAwesome(app: App) {
  app.component('FontAwesomeIcon', FontAwesomeIcon)
}
