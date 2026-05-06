import { createI18n } from 'vue-i18n'
import enUS from './locales/en-US'
import ptBR from './locales/pt-BR'
import frFR from './locales/fr-FR'
import itIT from './locales/it-IT'
import esES from './locales/es-ES'

const SUPPORTED_LOCALES = ['en-US', 'pt-BR', 'fr-FR', 'it-IT', 'es-ES'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function detectLocale(): SupportedLocale {
  const browserLocales = navigator.languages?.length ? navigator.languages : [navigator.language]

  for (const browserLocale of browserLocales) {
    // exact match (e.g. "pt-BR" → "pt-BR")
    const exact = SUPPORTED_LOCALES.find((l) => l === browserLocale)
    if (exact) return exact

    // language-only match (e.g. "fr" or "fr-CA" → "fr-FR")
    const lang = browserLocale.split('-')[0]
    const partial = SUPPORTED_LOCALES.find((l) => l.startsWith(lang + '-'))
    if (partial) return partial
  }

  return 'en-US'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'en-US': enUS,
    'pt-BR': ptBR,
    'fr-FR': frFR,
    'it-IT': itIT,
    'es-ES': esES,
  },
})
