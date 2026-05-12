<template>
  <div class="min-h-screen bg-gray-950 px-4 py-10">
    <div class="mx-auto max-w-3xl">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ t('dashboard.title') }}</h1>
          <p class="text-sm text-gray-400">{{ t('dashboard.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            @click="router.push('/session')"
          >
            <FontAwesomeIcon icon="microphone" class="mr-2" />
            {{ t('dashboard.newSession') }}
          </button>
          <button
            class="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700"
            @click="handleLogout"
          >
            {{ t('dashboard.logout') }}
          </button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <template v-if="store.loading">
        <div v-for="n in 3" :key="n" class="mb-4 animate-pulse rounded-xl bg-gray-800 p-5">
          <div class="mb-2 h-4 w-1/3 rounded bg-gray-700" />
          <div class="h-3 w-2/3 rounded bg-gray-700" />
        </div>
      </template>

      <!-- Error state -->
      <div
        v-else-if="store.error"
        class="rounded-xl bg-red-500/10 p-6 text-center text-red-400"
      >
        <p class="mb-3">{{ t('dashboard.loadError') }}</p>
        <button
          class="cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
          @click="loadData"
        >
          {{ t('dashboard.retry') }}
        </button>
      </div>

      <template v-else>
        <p v-if="deleteError" class="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {{ deleteError }}
        </p>

        <!-- Empty state -->
        <div
          v-if="store.conversations.length === 0"
          class="rounded-xl border border-dashed border-gray-700 p-12 text-center"
        >
          <FontAwesomeIcon icon="comments" class="mb-4 text-4xl text-gray-600" />
          <p class="text-gray-400">{{ t('dashboard.empty') }}</p>
        </div>

        <!-- Conversation list -->
        <div v-else>
          <div
            v-for="convo in store.conversations"
            :key="convo.id"
            class="mb-4 flex rounded-xl border border-gray-800 bg-gray-900 transition hover:border-indigo-500/50 hover:bg-gray-800"
          >
            <div
              class="min-w-0 flex-1 cursor-pointer p-5"
              @click="router.push(`/conversation/${convo.id}`)"
            >
              <div class="mb-1 flex items-start justify-between gap-4">
                <h2 class="font-semibold text-white">{{ convo.title }}</h2>
                <span class="shrink-0 text-xs text-gray-500">{{ formatDate(convo.createdAt) }}</span>
              </div>
              <p class="line-clamp-2 text-sm text-gray-400">{{ convo.summary }}</p>
            </div>
            <div class="flex shrink-0 items-center justify-center border-l border-gray-800 px-3 py-5">
              <button
                type="button"
                class="flex size-10 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-500/15 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                :aria-label="t('dashboard.deleteConversation')"
                :disabled="store.deletingId !== null"
                @click.stop="openDeleteModal(convo.id)"
              >
                <FontAwesomeIcon
                  :icon="store.deletingId === convo.id ? 'spinner' : 'trash'"
                  :class="store.deletingId === convo.id ? 'animate-spin' : ''"
                />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <ConfirmModal
      v-model="deleteModalOpen"
      :title="t('dashboard.deleteModalTitle')"
      :message="t('dashboard.deleteConfirm')"
      :confirm-label="t('conversation.delete')"
      :cancel-label="t('common.cancel')"
      :loading="!!pendingDeleteId && store.deletingId === pendingDeleteId"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDashboardStore } from './store/dashboard.store'
import { useAuthStore } from '@/modules/auth/store/auth.store'
import ConfirmModal from './ConfirmModal.vue'

const { t } = useI18n()
const router = useRouter()
const store = useDashboardStore()
const authStore = useAuthStore()
const deleteError = ref<string | null>(null)
const deleteModalOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)

watch(deleteModalOpen, (open) => {
  if (!open) pendingDeleteId.value = null
})

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  )
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

async function loadData() {
  deleteError.value = null
  if (authStore.user) {
    await store.load(authStore.user.uid)
  }
}

function mapDeleteErr(code: string): string {
  if (code === 'CONVERSATION_FORBIDDEN') return t('dashboard.deleteForbidden')
  if (code === 'CONVERSATION_NOT_FOUND') return t('dashboard.deleteNotFound')
  return t('dashboard.deleteFailed')
}

function openDeleteModal(conversationId: string) {
  pendingDeleteId.value = conversationId
  deleteModalOpen.value = true
}

async function confirmDelete() {
  const uid = authStore.user?.uid
  const id = pendingDeleteId.value
  if (!uid || !id) return
  deleteError.value = null
  try {
    await store.removeConversation(uid, id)
    deleteModalOpen.value = false
  } catch (e: unknown) {
    deleteModalOpen.value = false
    deleteError.value = mapDeleteErr(e instanceof Error ? e.message : '')
  }
}

onMounted(loadData)
</script>
