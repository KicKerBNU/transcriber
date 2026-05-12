# Roadmap

Each milestone maps 1-to-1 to a feature spec inside `docs/specs/`.

---

## Milestone 1 — Authentication ✅
**Spec:** [docs/specs/01-auth.md](../specs/01-auth.md)

- [x] Login with Firebase (Google OAuth + email/password)
- [x] Protected routes (redirect unauthenticated users to `/login`)
- [x] Persist session across page reloads
- [x] Logout

---

## Milestone 2 — Dashboard ✅
**Spec:** [docs/specs/02-dashboard.md](../specs/02-dashboard.md)

- [x] List all past conversations for the logged-in user
- [x] Show conversation title, date, and a snippet of the summary
- [x] Navigate to a conversation detail view
- [x] Empty state when no conversations exist yet

---

## Milestone 3 — Audio Session ✅
**Spec:** [docs/specs/03-audio-session.md](../specs/03-audio-session.md)

- [x] Button to start an audio session (request microphone permission)
- [x] Button to stop the session
- [x] Real-time speech-to-text display as the user speaks
- [x] Stream each utterance to OpenAI and display the AI response in real time
- [x] On session end, generate and save a full conversation summary
- [x] Persist the transcript + summary to Firestore

---

## Milestone 4 — Native Audio Agent (macOS) ✅
**Spec:** [docs/specs/04-native-agent.md](../specs/04-native-agent.md)

- [x] Python daemon captures system audio via BlackHole virtual device
- [x] Captures microphone in parallel and mixes both streams
- [x] Exposes a WebSocket server on `ws://localhost:8765`
- [x] Accepts `start` / `stop` / `ping` commands from the web app
- [x] Streams raw PCM chunks (16kHz, 16-bit mono) to the web app
- [x] Handles permissions errors and disconnections gracefully
- [x] Packaged as a downloadable zip (`public/transcriber-agent.zip`)

---

## Milestone 5 — Multi-Speaker Session 🔄
**Spec:** [docs/specs/05-multi-speaker-session.md](../specs/05-multi-speaker-session.md)

- [x] Auto-detect whether native agent is running on session page load
- [x] Agent mode: pipe audio through AssemblyAI for real-time diarized transcription
- [x] Mic-only mode: fall back to existing Web Speech API behaviour
- [x] Display speaker labels with distinct colors per speaker
- [x] Download banner shown when agent is not running
- [x] Stop command closes agent stream and AssemblyAI connection cleanly
- [x] Save speaker labels per line to Firestore
- [ ] Non-blocking banner when agent disconnects mid-session
- [ ] Clear error when AssemblyAI key is missing

---

## Milestone 6 — Netlify Deployment
**Spec:** docs/specs/06-deployment.md (to be written)

- [ ] Production build deployed to Netlify (CI on `main`)
- [ ] Environment variables configured in Netlify dashboard
- [ ] SPA redirect rule (`_redirects`) so Vue Router works on direct URL loads
- [ ] Firebase security rules locked down for production
- [ ] Custom domain (optional)

---

## Milestone 7 — One-Click Agent App (macOS)
**Spec:** docs/specs/07-agent-app.md (to be written)

The native agent must be usable by non-technical users — no terminal, no Python, no package managers.

- [ ] Packaged as a native macOS `.app` using **PyInstaller** (single-file binary, no Python install required)
- [ ] Runs as a **menu bar app** (system tray icon) — double-click the `.app` to start, click the icon to stop
- [ ] Status shown in the menu bar: idle / connected / error
- [ ] Distributed as a signed `.dmg` installer — drag to Applications, done
- [ ] Auto-connects to the web app; no configuration needed
- [ ] Graceful error if microphone or system audio permissions are not granted (shows a native macOS dialog)

---

## Future Ideas

- Export conversation as PDF or Markdown
- Share a conversation via public link
- Multi-language transcription support
- Windows agent support
