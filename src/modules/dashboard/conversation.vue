<template>
  <div class="min-h-screen bg-gray-950 px-4 py-10">
    <div class="mx-auto max-w-3xl">
      <button
        class="mb-6 cursor-pointer flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        @click="router.push('/dashboard')"
      >
        <FontAwesomeIcon icon="arrow-left" />
        {{ t('conversation.back') }}
      </button>

      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div class="h-6 w-1/2 animate-pulse rounded bg-gray-800" />
        <div class="h-4 w-full animate-pulse rounded bg-gray-800" />
      </div>

      <!-- Not found -->
      <div v-else-if="!convo" class="text-center text-gray-400">
        {{ t('conversation.notFound') }}
      </div>

      <template v-else>
        <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="mb-1 text-2xl font-bold text-white">{{ convo.title }}</h1>
            <p class="text-sm text-gray-500">{{ formatDate(convo.createdAt) }}</p>
          </div>
          <button
            type="button"
            class="cursor-pointer flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="deleting"
            @click="openDeleteModal"
          >
            <FontAwesomeIcon :icon="deleting ? 'spinner' : 'trash'" :class="deleting ? 'animate-spin' : ''" />
            {{ t('conversation.delete') }}
          </button>
        </div>

        <p v-if="deleteError" class="mb-6 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {{ deleteError }}
        </p>

        <!-- Summary -->
        <div class="mb-8 rounded-xl bg-indigo-600/10 border border-indigo-500/30 p-5">
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
            {{ t('conversation.summary') }}
          </h2>
          <p class="text-sm text-gray-300">{{ convo.summary }}</p>
        </div>

        <!-- Transcript -->
        <h2 class="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
          {{ t('conversation.transcript') }}
        </h2>
        <div class="space-y-3">
          <div
            v-for="(line, i) in convo.transcript"
            :key="i"
            class="flex gap-3"
            :class="line.speaker === 'ai' ? 'flex-row-reverse' : ''"
          >
            <div
              class="max-w-[80%] rounded-xl px-4 py-2.5 text-sm"
              :class="
                line.speaker === 'user'
                  ? 'bg-gray-800 text-gray-200'
                  : 'bg-indigo-600/20 text-indigo-200'
              "
            >
              {{ line.text }}
            </div>
          </div>
        </div>
      </template>
    </div>

    <ConfirmModal
      v-model="deleteModalOpen"
      :title="t('dashboard.deleteModalTitle')"
      :message="t('conversation.deleteConfirm')"
      :confirm-label="t('conversation.delete')"
      :cancel-label="t('common.cancel')"
      :loading="deleting"
      @confirm="executeDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { deleteConversation, fetchConversation } from './api/dashboard.api'
import type { Conversation } from './domain/conversation.types'
import { useAuthStore } from '@/modules/auth/store/auth.store'
import ConfirmModal from './ConfirmModal.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const convo = ref<Conversation | null>(null)
const loading = ref(true)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const deleteModalOpen = ref(false)

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

function mapDeleteErr(code: string): string {
  if (code === 'CONVERSATION_FORBIDDEN') return t('dashboard.deleteForbidden')
  if (code === 'CONVERSATION_NOT_FOUND') return t('dashboard.deleteNotFound')
  return t('dashboard.deleteFailed')
}

function openDeleteModal() {
  if (!authStore.user?.uid || !convo.value) return
  deleteModalOpen.value = true
}

async function executeDelete() {
  const uid = authStore.user?.uid
  const id = route.params.id as string
  if (!uid || !convo.value) return
  deleteError.value = null
  deleting.value = true
  try {
    await deleteConversation(uid, id)
    deleteModalOpen.value = false
    router.replace('/dashboard')
  } catch (e: unknown) {
    deleteModalOpen.value = false
    deleteError.value = mapDeleteErr(e instanceof Error ? e.message : '')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  convo.value = await fetchConversation(route.params.id as string)
  loading.value = false
})
</script>
