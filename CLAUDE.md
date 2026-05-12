# Project Overview

**Transcriber** — a real-time AI-powered conversation app built with Vue 3 and DDD.

Users start an audio session and speak freely. In **mic-only mode** the browser's Web Speech API transcribes the user's voice and GPT-4o replies in real time. In **agent mode** a native macOS Python daemon captures both mic and system audio, streams raw PCM to the web app over a local WebSocket, which forwards it to **AssemblyAI** for real-time multi-speaker diarized transcription — each speaker gets a labeled, color-coded bubble. Every session ends with an auto-generated OpenAI summary. Conversations (transcript + summary + speaker labels) are persisted per user via Firebase Firestore. Auth is handled by Firebase Auth.

---

## Documentation Structure

```
docs/
├── constitution/       ← stable product decisions, rarely changes
│   ├── MISSION.md      ← why this product exists
│   ├── TECH-STACK.md   ← technology choices and env variable reference
│   └── ROADMAP.md      ← milestones linked to specs
└── specs/              ← one file per feature, tracks lifecycle
    ├── 01-auth.md
    ├── 02-dashboard.md
    ├── 03-audio-session.md
    ├── 04-native-agent.md
    └── 05-multi-speaker-session.md
```

---

## Spec-Driven Development (SDD)

Before implementing any feature:
1. Write or review the spec in `docs/specs/`
2. Set `status: draft` and get alignment before writing any code
3. Move to `status: approved` once requirements, domain types, and acceptance criteria are confirmed
4. Implement — set `status: in-progress`
5. Mark each acceptance criterion `[x]` as it passes
6. Set `status: done` when all criteria are met

### Spec lifecycle

| Status | Meaning |
|---|---|
| `draft` | Being written — not ready to implement |
| `approved` | Requirements locked — safe to start implementation |
| `in-progress` | Actively being built |
| `done` | All acceptance criteria met |

### Spec frontmatter

Every spec file opens with:

```markdown
---
id: 01-auth
title: Authentication
status: done
milestone: 1
module: src/modules/auth
route: /login
---
```

---

## Modules

| Module | Route | Spec | Status |
|---|---|---|---|
| `auth` | `/login` | [docs/specs/01-auth.md](docs/specs/01-auth.md) | done |
| `dashboard` | `/dashboard` | [docs/specs/02-dashboard.md](docs/specs/02-dashboard.md) | done |
| `session` | `/session` | [docs/specs/03-audio-session.md](docs/specs/03-audio-session.md) | done |
| `agent/` | N/A | [docs/specs/04-native-agent.md](docs/specs/04-native-agent.md) | done |
| `session` (extended) | `/session` | [docs/specs/05-multi-speaker-session.md](docs/specs/05-multi-speaker-session.md) | in-progress |

---

## Tech Stack

- **Vue 3** with `<script setup>` and Composition API
- **TypeScript** (strict mode)
- **Vite** (build tool)
- **Vue Router 5** (client-side routing)
- **Pinia 3** (state management)
- **Tailwind CSS 4** (utility-first styling, via `@tailwindcss/vite`)
- **vue-i18n 11** (internationalization — `legacy: false`, Composition API mode)
- **FontAwesome 7** (icons via `@fortawesome/vue-fontawesome`, registered globally as `<FontAwesomeIcon>`)
- **Firebase** (Auth + Firestore lite SDK — no real-time listeners)
- **OpenAI SDK** (streaming completions + summarization via GPT-4o)
- **AssemblyAI Streaming v3** (`u3-rt-pro`, speaker diarization, format_turns — agent mode only)
- **Python native agent** (`sounddevice` + `websockets`) — captures mic + system audio, resamples to 16 kHz, streams PCM over `ws://localhost:8765`
- **Storybook 10** (component development and visual testing)

---

## Folder Structure

```
src/
├── modules/            # Feature modules (DDD)
│   └── <feature>/
│       ├── api/        # Firestore / HTTP calls
│       ├── domain/     # TypeScript interfaces and types
│       ├── store/      # Pinia store (Setup Store style)
│       ├── <feature>.routes.ts
│       └── <feature>.vue
├── i18n/
│   ├── index.ts
│   └── locales/        # en-US, pt-BR, fr-FR, it-IT, es-ES
├── plugins/
│   ├── firebase.ts     # Firebase app, auth, db, googleProvider
│   └── fontawesome.ts  # FA library + global <FontAwesomeIcon>
├── router/
│   └── index.ts        # Spreads module routes + auth guard
├── assets/styles/
│   └── main.css        # Tailwind entry (@import "tailwindcss")
├── App.vue             # Root — only <RouterView />
└── main.ts             # Bootstrap: Pinia, Router, i18n, FA
```

---

## Conventions

- No `components/` at `src` root — components belong inside their feature module
- Each feature module owns its routes; `src/router/index.ts` spreads them all
- Pinia stores use **Setup Store** style (`defineStore` with `ref`/`computed`)
- Use the `@/` alias for all absolute imports
- TypeScript contracts go in the feature's `domain/` folder
- All UI text through `useI18n` — no hardcoded strings in templates
- Translation keys namespaced by feature (e.g. `auth.errors.emailRequired`)
- FA icons registered in `src/plugins/fontawesome.ts`

---

## Commands

```bash
npm run dev           # Start dev server (http://localhost:3798)
npm run agent         # Start native audio agent (ws://localhost:8765)
npm run build         # Type-check + build
npm run preview       # Preview production build
npm run storybook     # Start Storybook (http://localhost:6006)
npm run format        # Prettier format src/
```
