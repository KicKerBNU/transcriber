import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchConversations, deleteConversation } from '../api/dashboard.api'
import type { Conversation } from '../domain/conversation.types'

export const useDashboardStore = defineStore('dashboard', () => {
  const conversations = ref<Conversation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const deletingId = ref<string | null>(null)

  async function load(userId: string) {
    loading.value = true
    error.value = null
    try {
      conversations.value = await fetchConversations(userId)
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function removeConversation(userId: string, id: string): Promise<void> {
    deletingId.value = id
    try {
      await deleteConversation(userId, id)
      conversations.value = conversations.value.filter((c) => c.id !== id)
    } finally {
      deletingId.value = null
    }
  }

  return { conversations, loading, error, deletingId, load, removeConversation }
})
