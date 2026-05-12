---
id: 04-native-agent
title: Native Audio Agent (macOS)
status: in-progress
milestone: 4
module: agent/
route: N/A — local service
---

# Spec 04 — Native Audio Agent (macOS)

## Overview

A lightweight Python daemon that runs on the user's macOS machine. It captures system audio (all apps — Discord, Zoom, Slack desktop, etc.) and microphone audio simultaneously, then streams the mixed PCM audio to the web app over a local WebSocket connection. The web app forwards this stream to a real-time transcription service for speaker-diarized transcription.

This unlocks recording of all participants in any conversation regardless of platform.

---

## Architecture

```
┌──────────────────────────────────────┐        ┌────────────────────────────┐
│           Native Agent               │        │         Web App            │
│  (python agent/main.py)              │        │      (browser)             │
│                                      │        │                            │
│  ScreenCaptureKit → system audio ──┐ │        │  ws://localhost:8765       │
│  sounddevice      → mic audio    ──┤─│──WS──▶ │  receives PCM chunks       │
│                                    │ │        │  forwards to AssemblyAI    │
│  mix → chunk (100ms) → send        │ │        │  renders diarized lines    │
└──────────────────────────────────────┘        └────────────────────────────┘
```

---

## Features

### F-04.1 System Audio Capture

- Capture all system audio output using **CoreAudio process tap** (`AudioHardwareCreateProcessTap`, macOS 14.2+)
- No Screen Recording permission needed — the process tap API captures all app audio without it
- Works with all apps including podcast players, streaming services, and browsers that previously opted out of ScreenCaptureKit capture

### F-04.2 Microphone Capture

- Capture from the default system microphone using `sounddevice`
- Runs in a separate thread alongside system audio capture
- Both streams are captured at **16 kHz, 16-bit PCM mono** (required by AssemblyAI/Deepgram)

### F-04.3 Stream Mixing

- Combine system audio and microphone into a single interleaved stream
- Simple additive mix with clipping protection (normalize if peak > 1.0)
- Send mixed audio OR send both channels separately if the transcription service supports stereo diarization

### F-04.4 WebSocket Server

- Listens on `ws://localhost:8765`
- Only accepts connections from `localhost` — reject any other origin
- Supports exactly one active connection at a time (the web app)
- Protocol:

**Incoming commands (JSON from web app):**

| Command | Payload | Description |
|---|---|---|
| `start` | `{}` | Begin audio capture and streaming |
| `stop` | `{}` | Stop capture, close audio streams |
| `ping` | `{}` | Health check — agent replies with `pong` |

**Outgoing messages (agent → web app):**

| Type | Payload | Description |
|---|---|---|
| `ready` | `{}` | Sent on connection — agent is healthy |
| `audio` | binary bytes | Raw PCM chunk (~100ms of audio) |
| `error` | `{ "message": string }` | Capture or permission error |
| `stopped` | `{}` | Capture has fully stopped |

### F-04.5 Permissions Handling

- CoreAudio process tap requires no Screen Recording permission
- No macOS permission dialog is shown — the tap starts immediately
- Microphone permission is handled at the OS/browser level, not by the agent

### F-04.6 Lifecycle & Installation

- Entry point: `agent/main.py`
- Dependencies declared in `agent/requirements.txt`
- User installs with: `cd agent && pip install -r requirements.txt`
- User runs with: `python agent/main.py`
- Agent runs until the user terminates it (`Ctrl+C`) — it is not a background service

### F-04.7 Distribution Package

- The `agent/` folder is zipped and placed at `public/transcriber-agent.zip` so it is served as a static asset by the web app
- The zip includes: `main.py`, `capture.py`, `mixer.py`, `requirements.txt`, `README.md`
- `README.md` inside the zip must contain clear install + run instructions (see F-04.6)
- The zip is updated manually whenever the agent code changes — there is no automated build step for now
- The web app download button links directly to `/transcriber-agent.zip` (see Spec 05 F-05.1)

---

## Folder Structure

```
agent/
├── main.py              # Entry point — starts WebSocket server
├── capture.py           # System audio + mic capture logic
├── mixer.py             # Combines audio streams
├── requirements.txt     # Python dependencies
└── README.md            # Install and run instructions
```

---

## Dependencies

```
websockets>=12.0
sounddevice>=0.4.6
numpy>=1.26
```

Swift binary (`agent/capture_system.swift`) compiled with:
```
-framework CoreAudio -framework Foundation
```
Requires macOS 14.2+ (for `AudioHardwareCreateProcessTap`).

---

## Audio Format

| Property | Value |
|---|---|
| Sample rate | 16 000 Hz |
| Bit depth | 16-bit signed PCM |
| Channels | 1 (mono) |
| Chunk size | ~100 ms (~3 200 bytes per chunk) |

---

## Error Cases

| Scenario | Agent behaviour |
|---|---|
| No audio input device found (no clock source) | Tap still starts, falls back to tap-only aggregate |
| `AudioHardwareCreateProcessTap` fails (macOS < 14.2) | `capture_system` exits with error message |
| No audio output device found | Send `error` message, keep WS open |
| Web app disconnects mid-session | Stop capture, reset — wait for reconnect |
| Second client tries to connect | Reject with `1008 Policy Violation` |

---

## Security

- WebSocket server binds to `127.0.0.1` only — never `0.0.0.0`
- Validate `Origin` header on every handshake; reject if not `http://localhost:*` or `https://*.your-domain.com`
- No authentication token required (localhost-only binding is sufficient)

---

## Acceptance Criteria

- [x] `public/transcriber-agent.zip` exists and contains all agent files + README
- [x] Running `python agent/main.py` starts the WebSocket server on `ws://localhost:8765`
- [x] Connecting and sending `start` begins streaming binary PCM chunks
- [x] System audio from any app (e.g. browser, Spotify) is captured in the stream
- [x] Microphone audio is captured and mixed into the stream
- [x] Sending `stop` halts capture and the agent replies with `stopped`
- [x] Sending `ping` returns `pong` without interrupting capture
- [x] A second connection attempt is rejected while one client is active
- [x] No Screen Recording permission required — CoreAudio process tap captures all apps including podcast players
- [x] `Ctrl+C` shuts down cleanly with no zombie processes
