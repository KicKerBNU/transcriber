---
id: 05-multi-speaker-session
title: Multi-Speaker Session
status: in-progress
milestone: 5
module: src/modules/session
route: /session
---

# Spec 05 — Multi-Speaker Session

## Overview

Extends the existing audio session (Spec 03) to support multi-speaker conversations. When the Native Agent (Spec 04) is running on the user's machine, the web app switches from Web Speech API to a pipeline that receives system audio from the agent and sends it to **AssemblyAI** for real-time transcription with speaker diarization. Each speaker is identified and labeled separately in the transcript.

The existing single-mic mode (Web Speech API) is preserved as a fallback when the agent is not running.

---

## Features

### F-05.1 Agent Detection

- On session page load, attempt to connect to `ws://localhost:8765` with a 2-second timeout
- If connection succeeds and agent responds with `ready`: activate **Agent Mode**
- If connection fails or times out: activate **Mic-Only Mode** (existing behaviour)
- Show a status indicator in the session UI communicating which mode is active

### F-05.2 Agent Not Detected — Download Banner

When agent detection fails (mic-only fallback), show a dismissible banner above the controls:

```
┌─────────────────────────────────────────────────────────────┐
│  Want to capture all speakers?                          [×] │
│  Download the Transcriber Agent to record system audio.     │
│                                                             │
│  [↓ Download Agent]   Continue with mic only →             │
└─────────────────────────────────────────────────────────────┘
```

- **Download Agent** button: `<a href="/transcriber-agent.zip" download>` — triggers a browser file download of the zip from `public/transcriber-agent.zip` (see Spec 04 F-04.7)
- **Continue with mic only** link: dismisses the banner and proceeds normally
- **[×]** closes the banner for the rest of the session (not persisted across reloads)
- Banner is never shown when agent is already connected

### F-05.3 Agent Mode — Audio Pipeline

When the agent is available:

1. Web app sends `start` command to the agent
2. Agent begins streaming binary PCM chunks to the web app
3. Web app opens a WebSocket to **AssemblyAI Streaming API** using `VITE_ASSEMBLYAI_API_KEY`
4. Each PCM chunk received from the agent is forwarded to AssemblyAI
5. AssemblyAI returns real-time transcription events with `speaker` labels (`A`, `B`, `C`…)
6. Transcript lines are rendered per speaker with distinct visual styling
7. Each final utterance triggers an AI response (same OpenAI stream as today)

### F-05.4 Mic-Only Mode — Fallback

- Identical to the current Spec 03 behaviour (Web Speech API)
- All transcript lines are attributed to `'user'`
- AI responses still work as before
- No changes to existing logic

### F-05.5 Speaker Labels in Transcript

- Replace the current `speaker: 'user' | 'ai'` with `speaker: string`
- In agent mode, human speakers are labeled `'Speaker A'`, `'Speaker B'`, etc. (mapped from AssemblyAI's `A`, `B`)
- AI responses remain `'ai'`
- Each speaker gets a consistent color assigned on first appearance (cycle through a predefined palette)
- Speaker label shown as a small tag above each bubble

### F-05.6 Session UI — Mode Indicator

Add a small indicator in the top bar (next to the recording status dot):

| State | Indicator |
|---|---|
| Agent connected | Green dot + "Multi-speaker" |
| Mic only | Gray dot + "Mic only" |
| Agent error | Yellow dot + "Agent disconnected" |

### F-05.7 Stop & Summarize

- On stop: send `stop` command to the agent (if in agent mode)
- Close AssemblyAI WebSocket
- Summarization and Firestore save work the same as Spec 03
- Transcript saved includes speaker labels per line

### F-05.8 Agent Disconnection Mid-Session

- If the agent WebSocket closes unexpectedly during a session, show a non-blocking banner: "Agent disconnected — new speech will not be captured"
- Do not crash the session — allow the user to stop and save what was captured

---

## Domain Types

```ts
// src/modules/session/domain/session.types.ts

type SessionMode = 'mic-only' | 'agent'

interface TranscriptLine {
  speaker: string        // 'ai' | 'Speaker A' | 'Speaker B' | 'user'
  text: string
  timestamp: Date
  isFinal: boolean
}

interface SessionState {
  mode: SessionMode
  agentConnected: boolean
  status: 'idle' | 'recording' | 'processing' | 'done' | 'error'
  transcript: TranscriptLine[]
  summary: string | null
  error: string | null
}
```

---

## New Environment Variables

```bash
VITE_ASSEMBLYAI_API_KEY=your-key-here
VITE_AGENT_WS_URL=ws://localhost:8765   # default, override for dev
```

---

## Speaker Color Palette

Assign colors in order of first appearance. Suggested palette (Tailwind-compatible):

| Index | Speaker | Text class | Bubble class |
|---|---|---|---|
| 0 | Speaker A | `text-indigo-300` | `bg-indigo-600/20` |
| 1 | Speaker B | `text-emerald-300` | `bg-emerald-600/20` |
| 2 | Speaker C | `text-amber-300` | `bg-amber-600/20` |
| 3 | Speaker D | `text-rose-300` | `bg-rose-600/20` |
| `'ai'` | AI | `text-indigo-100` | `bg-indigo-600/20` |
| `'user'` | You (mic-only) | `text-gray-200` | `bg-gray-800` |

---

## Validations

| Rule | Behaviour |
|---|---|
| Agent not running on page load | Silently fall back to mic-only mode |
| AssemblyAI key missing | Show error banner, disable agent mode |
| AssemblyAI connection fails | Show error, fall back to mic-only |
| Agent disconnects mid-session | Show non-blocking banner, preserve transcript |
| No transcript lines on stop | Return to idle, do not summarize |

---

## Files to Change

| File | Change |
|---|---|
| `src/modules/session/domain/session.types.ts` | Update `TranscriptLine.speaker` to `string`, add `SessionMode` |
| `src/modules/session/store/session.store.ts` | Add agent WS client, AssemblyAI client, mode detection, speaker mapping |
| `src/modules/session/session.vue` | Mode indicator, download banner, speaker-colored bubbles, speaker label tags |
| `src/i18n/locales/*.ts` | Add keys for mode indicator and download banner labels |
| `public/transcriber-agent.zip` | Agent distribution package (see Spec 04 F-04.7) |
| `.env.example` | Add `VITE_ASSEMBLYAI_API_KEY` and `VITE_AGENT_WS_URL` |

---

## Acceptance Criteria

- [x] With agent running: session page detects it within 2 seconds and shows "Multi-speaker" indicator
- [x] With agent not running: session falls back to mic-only mode and shows the download banner
- [x] Download banner "Download Agent" button triggers download of `/transcriber-agent.zip`
- [x] Download banner can be dismissed with [×] or "Continue with mic only"
- [x] Download banner is never shown when agent is connected
- [x] In agent mode: audio from all system sources is transcribed in real time
- [x] Each speaker is assigned a distinct color that stays consistent throughout the session
- [x] Speaker labels appear above each transcript bubble
- [x] AI responses still stream in real time regardless of mode
- [x] Stopping the session sends `stop` to the agent and closes the AssemblyAI connection
- [x] The saved transcript includes speaker labels per line
- [ ] Agent disconnecting mid-session shows a banner but does not crash or lose transcript
- [ ] AssemblyAI key missing shows a clear error and disables agent mode gracefully
