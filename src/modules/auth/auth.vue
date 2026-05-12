<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-950 px-4">
    <div class="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-2xl">
      <h1 class="mb-2 text-center text-2xl font-bold text-white">{{ t('auth.title') }}</h1>
      <p class="mb-8 text-center text-sm text-gray-400">{{ t('auth.subtitle') }}</p>

      <!-- Google login -->
      <button
        class="mb-4 flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="loading"
        @click="handleGoogleLogin"
      >
        <FontAwesomeIcon icon="fa-brands fa-google" />
        {{ t('auth.googleLogin') }}
      </button>

      <div class="mb-4 flex items-center gap-3">
        <div class="h-px flex-1 bg-gray-700" />
        <span class="text-xs text-gray-500">{{ t('auth.or') }}</span>
        <div class="h-px flex-1 bg-gray-700" />
      </div>

      <!-- Email / password form -->
      <form class="space-y-4" @submit.prevent="handleEmailLogin">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-400">{{ t('auth.email') }}</label>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            :placeholder="t('auth.emailPlaceholder')"
          />
          <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-400">{{ fieldErrors.email }}</p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-400">{{
            t('auth.password')
          }}</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            :placeholder="t('auth.passwordPlaceholder')"
          />
          <p v-if="fieldErrors.password" class="mt-1 text-xs text-red-400">
            {{ fieldErrors.password }}
          </p>
        </div>

        <p v-if="authError" class="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {{ authError }}
        </p>

        <button
          type="submit"
          class="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? t('auth.loggingIn') : t('auth.login') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from './store/auth.store'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const authError = ref<string | null>(null)
const fieldErrors = reactive({ email: '', password: '' })

function validate(): boolean {
  fieldErrors.email = ''
  fieldErrors.password = ''
  let valid = true
  if (!email.value.trim()) {
    fieldErrors.email = t('auth.errors.emailRequired')
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    fieldErrors.email = t('auth.errors.emailInvalid')
    valid = false
  }
  if (!password.value) {
    fieldErrors.password = t('auth.errors.passwordRequired')
    valid = false
  }
  return valid
}

async function handleGoogleLogin() {
  authError.value = null
  loading.value = true
  try {
    await authStore.loginWithGoogle()
    redirect()
  } catch (e: unknown) {
    authError.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function handleEmailLogin() {
  authError.value = null
  if (!validate()) return
  loading.value = true
  try {
    await authStore.loginWithEmail(email.value, password.value)
    redirect()
  } catch (e: unknown) {
    authError.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function redirect() {
  const target = (route.query.redirect as string) || '/dashboard'
  router.push(target)
}
</script>
