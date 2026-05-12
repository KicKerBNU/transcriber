---
id: 03-audio-session
title: Audio Session
status: done
milestone: 3
module: src/modules/session
route: /session
---

# Spec 03 — Audio Session

## Overview

The audio session is the core feature of the product. Users activate their microphone, speak, and receive real-time AI responses. When the session ends a full summary is generated and the conversation is persisted.

---

## Features

### F-03.1 Start Session
- Route: `/session`
- A "Start" button requests microphone permission via the Web Speech API (`SpeechRecognition`)
- Microphone permission denied → show a clear error with instructions to enable it in browser settings

### F-03.2 Real-Time Transcription
- As the user speaks, transcript lines appear in real time
- Each interim result is shown in a dimmed/italic style; final results are styled normally
- The transcript panel auto-scrolls to the latest line

### F-03.3 Real-Time AI Response
- Each final transcript utterance is streamed to the OpenAI Chat Completions API (`gpt-4o`, `stream: true`)
- The AI response streams in character-by-character below the user's line
- The system prompt keeps the AI in "active listener / conversation partner" mode

### F-03.4 Stop Session
- A "Stop" button ends the microphone capture
- Triggers the summarization flow (F-03.5) automatically

### F-03.5 Summarization
- After the session ends, the full transcript is sent to OpenAI with a summarization prompt
- The generated summary is displayed in a collapsible panel below the transcript
- Summary + transcript are saved to Firestore under the logged-in user

### F-03.6 Persist & Redirect
- On save success: navigate to `/conversation/:id` (the newly created conversation)
- On save error: show a toast notification with a retry option

---

## Domain Types

```ts
// src/modules/session/domain/session.types.ts
interface Session {
  id: string
  userId: string
  status: 'idle' | 'recording' | 'processing' | 'done' | 'error'
  transcript: TranscriptLine[]
  summary: string | null
  startedAt: Date | null
  endedAt: Date | null
}

interface TranscriptLine {
  speaker: 'user' | 'ai'
  text: string
  timestamp: Date
  isFinal: boolean
}
```

---

## Environment Variables Required

```bash
VITE_OPENAI_API_KEY=sk-...
```

---

## Validations

| Rule | Behaviour |
|---|---|
| Microphone permission denied | Show inline error with browser settings guidance |
| OpenAI API key missing | Throw at startup with a developer-facing console error |
| OpenAI stream error | Show "AI response failed" inline, allow user to continue recording |
| Firestore save error | Show toast with retry; do not lose the transcript |
| Session with no speech | Disable "Stop" until at least one final transcript line exists |

---

## Acceptance Criteria

- [x] "Start" button requests microphone and begins capturing speech
- [x] Interim transcript lines appear in real time as the user speaks
- [x] Final lines trigger a streamed AI response that appears character-by-character
- [x] "Stop" button is enabled only after at least one transcript line
- [x] Stopping the session triggers summarization
- [x] Summary is displayed after generation
- [x] Conversation is saved to Firestore and user is redirected to the detail view
- [x] Microphone denial shows a helpful error message
- [x] AI stream errors are handled gracefully without crashing the session
