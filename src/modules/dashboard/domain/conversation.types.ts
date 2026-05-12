export interface TranscriptLine {
  speaker: 'user' | 'ai'
  text: string
  timestamp: Date
  isFinal: boolean
}

export interface Conversation {
  id: string
  userId: string
  title: string
  summary: string
  transcript: TranscriptLine[]
  createdAt: Date
  updatedAt: Date
}
