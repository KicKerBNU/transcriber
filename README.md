# Transcriber

A real-time AI-powered conversation app built with Vue 3 and Domain-Driven Design.

Transcriber captures your conversations through the microphone — or all audio in the room via a native macOS agent — and transcribes every word live. In agent mode, speakers are automatically identified and color-coded. When the session ends, an AI summary is generated and the full transcript is saved to your personal history.

> **Speak. Understand. Remember.**

---

## What it does

| Capability | Details |
|---|---|
| Live transcription | Mic-only (Web Speech API) or multi-speaker via AssemblyAI |
| Speaker diarization | Native agent captures system + mic audio; AssemblyAI identifies each speaker |
| Real-time AI responses | Every utterance is streamed to GPT-4o for live contextual replies |
| Auto-summary | Session end triggers an OpenAI summarization saved with the transcript |
| Conversation history | Past sessions stored per user in Firestore, accessible from the dashboard |
| Auth | Google OAuth + email/password via Firebase Auth |
| Localization | 5 languages — English, Portuguese, French, Italian, Spanish |

---

## How it works

```
Mic only mode
  Browser mic → Web Speech API → transcript → GPT-4o stream → summary → Firestore

Agent mode (multi-speaker)
  Mic + system audio
       ↓
  Python agent (macOS) ──PCM──► Web app ──PCM──► AssemblyAI (speaker diarization)
                                                        ↓
                                              transcript per speaker
                                                        ↓
                                             GPT-4o stream → summary → Firestore
```

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| [Vue 3](https://vuejs.org/) | ^3.5 | UI framework — Composition API with `<script setup>` |
| [TypeScript](https://www.typescriptlang.org/) | ~6.0 | Strict typing across all layers |
| [Vite](https://vite.dev/) | ^8.0 | Dev server and build tool |
| [Vue Router](https://router.vuejs.org/) | ^5.0 | Client-side routing |
| [Pinia](https://pinia.vuejs.org/) | ^3.0 | State management (Setup Store style) |
| [Tailwind CSS](https://tailwindcss.com/) | ^4.0 | Utility-first styling via `@tailwindcss/vite` |
| [vue-i18n](https://vue-i18n.intlify.dev/) | ^11.0 | Internationalization — auto-detects browser language |
| [FontAwesome](https://fontawesome.com/) | ^7.0 | Icons — registered globally as `<FontAwesomeIcon>` |
| [Firebase](https://firebase.google.com/) | ^12.0 | Auth + Firestore (lite SDK) |
| [OpenAI SDK](https://platform.openai.com/) | ^6.0 | Streaming completions + summarization (GPT-4o) |
| [AssemblyAI](https://www.assemblyai.com/) | Streaming v3 | Real-time diarized transcription in agent mode |
| [Storybook](https://storybook.js.org/) | ^10.0 | Isolated component development and visual testing |

**Native agent** (macOS only): Python 3.12 + `sounddevice` + `websockets` — captures system audio and mic, streams 16 kHz PCM over a local WebSocket.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
VITE_OPENAI_API_KEY=sk-...
VITE_ASSEMBLYAI_API_KEY=...        # required for multi-speaker mode

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 3. Start the dev server

```bash
npm run dev        # http://localhost:3798
```

### 4. (Optional) Start the native agent for multi-speaker mode

```bash
npm run agent      # ws://localhost:8765
```

The first run creates a Python virtual environment and installs dependencies automatically. Requires Python 3.11+.

For system audio capture (to hear other people in the room), install [BlackHole](https://github.com/ExistentialAudio/BlackHole) and set it as your Mac's system audio output before starting the agent.

---

## Available Commands

```bash
npm run dev              # Dev server at http://localhost:3798
npm run agent            # Native audio agent at ws://localhost:8765
npm run build            # Type-check + production build
npm run preview          # Preview production build locally
npm run storybook        # Storybook at http://localhost:6006
npm run build-storybook  # Build static Storybook
npm run format           # Prettier format src/
```

---

## Folder Structure

```
src/
├── modules/                  # Feature modules (DDD)
│   ├── auth/                 # Login — Firebase Auth
│   ├── dashboard/            # Conversation history — Firestore
│   └── session/              # Live session — transcription + AI
│       ├── api/              # Firestore save
│       ├── domain/           # session.types.ts
│       ├── store/            # session.store.ts (Pinia)
│       └── session.vue
├── i18n/
│   ├── index.ts              # createI18n — auto-detects browser locale
│   └── locales/              # en-US, pt-BR, fr-FR, it-IT, es-ES
├── plugins/
│   ├── firebase.ts           # Firebase app, auth, db, googleProvider
│   └── fontawesome.ts        # FA library setup + global component
├── router/
│   └── index.ts              # Spreads module routes + auth guard
├── assets/styles/
│   └── main.css              # Tailwind entry point
├── App.vue                   # Root — only <RouterView />
└── main.ts                   # Bootstrap — Pinia, Router, i18n, FA

agent/                        # Native macOS audio agent (Python)
├── main.py                   # WebSocket server
├── capture.py                # Mic + system audio capture with resampling
├── mixer.py                  # PCM additive mix with clipping protection
├── requirements.txt
└── start.sh                  # Bootstraps venv and starts the agent

docs/
├── constitution/             # Stable product decisions
│   ├── MISSION.md
│   ├── TECH-STACK.md
│   └── ROADMAP.md
└── specs/                    # One spec per feature, tracks lifecycle
    ├── 01-auth.md            ✅ done
    ├── 02-dashboard.md       ✅ done
    ├── 03-audio-session.md   ✅ done
    ├── 04-native-agent.md    ✅ done
    └── 05-multi-speaker-session.md  🔄 in-progress
```
