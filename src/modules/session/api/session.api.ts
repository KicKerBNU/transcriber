import { collection, addDoc, serverTimestamp } from 'firebase/firestore/lite'
import { db } from '@/plugins/firebase'
import type { TranscriptLine } from '../domain/session.types'

export async function saveConversation(
  userId: string,
  transcript: TranscriptLine[],
  summary: string,
): Promise<string> {
  const title = summary.slice(0, 60) + (summary.length > 60 ? '...' : '')
  const ref = await addDoc(collection(db, 'conversations'), {
    userId,
    title,
    summary,
    transcript: transcript.map((l) => ({
      speaker: l.speaker,
      text: l.text,
      timestamp: l.timestamp,
      isFinal: l.isFinal,
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}
