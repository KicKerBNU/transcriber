<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const features = [
  { icon: 'bolt', key: 'vite' },
  { icon: 'palette', key: 'tailwind' },
  { icon: 'database', key: 'pinia' },
  { icon: 'route', key: 'router' },
  { icon: 'layer-group', key: 'ddd' },
  { icon: 'code', key: 'typescript' },
  { icon: 'book', key: 'storybook' },
  { icon: 'globe', key: 'i18n' },
] as const
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white">
    <!-- Hero -->
    <section class="flex flex-col items-center justify-center px-6 py-28 text-center">
      <span
        class="mb-4 rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300"
      >
        {{ t('home.badge') }}
      </span>

      <h1 class="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
        {{ t('home.headline') }}
        <span class="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          {{ t('home.headlineHighlight') }}
        </span>
      </h1>

      <p class="mt-6 max-w-xl text-lg text-gray-400">
        {{ t('home.description') }}
      </p>

      <div class="mt-10 flex flex-wrap justify-center gap-4">
        <button
          class="rounded-xl bg-violet-600 px-6 py-3 font-semibold shadow-lg shadow-violet-500/20 transition hover:bg-violet-500"
        >
          {{ t('home.cta.start') }}
        </button>
        <button
          class="rounded-xl border border-gray-700 px-6 py-3 font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
        >
          {{ t('home.cta.docs') }}
        </button>
      </div>
    </section>

    <!-- Feature cards -->
    <section class="mx-auto max-w-6xl px-6 pb-28">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="feature in features"
          :key="feature.key"
          class="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-violet-500/50 hover:bg-gray-800/60"
        >
          <div
            class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400"
          >
            <FontAwesomeIcon :icon="feature.icon" class="text-lg" />
          </div>
          <h3 class="mb-2 font-semibold text-white">
            {{ t(`home.features.${feature.key}.title`) }}
          </h3>
          <p class="text-sm leading-relaxed text-gray-400">
            {{ t(`home.features.${feature.key}.description`) }}
          </p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
      {{ t('home.footer') }}
    </footer>
  </div>
</template>
