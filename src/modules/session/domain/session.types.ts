export type SessionMode = 'mic-only' | 'agent'
export type SessionStatus = 'idle' | 'recording' | 'processing' | 'done' | 'error'

export interface TranscriptLine {
  speaker: string // 'user' | 'ai' | 'Speaker A' | 'Speaker B' …
  text: string
  timestamp: Date
  isFinal: boolean
}

export interface Session {
  id: string
  userId: string
  status: SessionStatus
  transcript: TranscriptLine[]
  summary: string | null
  startedAt: Date | null
  endedAt: Date | null
}
