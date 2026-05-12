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
  faMicrophone,
  faStop,
  faSpinner,
  faCheck,
  faArrowLeft,
  faComments,
  faDownload,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import type { App } from 'vue'

library.add(
  faBolt, faPalette, faDatabase, faRoute, faLayerGroup, faCode, faBook, faGlobe,
  faMicrophone, faStop, faSpinner, faCheck, faArrowLeft, faComments, faDownload, faTrash,
  faGoogle,
)

export function registerFontAwesome(app: App) {
  app.component('FontAwesomeIcon', FontAwesomeIcon)
}
