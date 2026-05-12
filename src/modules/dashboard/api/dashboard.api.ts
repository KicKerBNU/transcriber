import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore/lite'
import { db } from '@/plugins/firebase'
import type { Conversation } from '../domain/conversation.types'

function toConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    id,
    userId: data.userId as string,
    title: data.title as string,
    summary: data.summary as string,
    transcript: (data.transcript as Conversation['transcript']) ?? [],
    createdAt: (data.createdAt as { toDate(): Date }).toDate(),
    updatedAt: (data.updatedAt as { toDate(): Date }).toDate(),
  }
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const q = query(collection(db, 'conversations'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toConversation(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, 'conversations', id))
  if (!snap.exists()) return null
  return toConversation(snap.id, snap.data() as Record<string, unknown>)
}

/** Deletes a conversation only if it belongs to the given user (client-side check). */
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  const ref = doc(db, 'conversations', conversationId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    throw new Error('CONVERSATION_NOT_FOUND')
  }
  const data = snap.data() as Record<string, unknown>
  if (data.userId !== userId) {
    throw new Error('CONVERSATION_FORBIDDEN')
  }
  await deleteDoc(ref)
}
