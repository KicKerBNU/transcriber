# Transcriber Agent

A small Python service that captures your Mac's system audio and microphone, then streams the audio to the Transcriber web app so every participant in a call gets transcribed — not just you.

---

## Requirements

- macOS 12.3 or later
- Python 3.10 or later

---

## Install

```bash
cd transcriber-agent
pip install -r requirements.txt
```

---

## Run

```bash
python main.py
```

The agent starts a WebSocket server on `ws://localhost:8765`. Keep the terminal open while using the Transcriber web app. Press `Ctrl+C` to stop.

---

## Enable System Audio (Capture All Participants)

Without extra setup the agent only captures your microphone. To capture everyone on a call you need to route system audio through a virtual device:

1. Install **[BlackHole 2ch](https://existential.audio/blackhole/)** (free, open source)
2. Open **Audio MIDI Setup** (search with Spotlight: `⌘ Space → "Audio MIDI Setup"`)
3. Click **+** in the bottom-left → **Create Multi-Output Device**
4. Check both your speakers/headphones **and** BlackHole 2ch
5. Go to **System Settings → Sound → Output** and select the new Multi-Output Device
6. Restart the agent — it will detect BlackHole automatically and log:
   ```
   [capture] system audio device: BlackHole 2ch (index X)
   [capture] started (system audio: True)
   ```

Once set up, the Transcriber web app will show **Multi-speaker** in the session indicator.

---

## Troubleshooting

**Web app shows "Mic only" even with the agent running**
- Make sure the agent started before you opened the session page
- Reload the session page — it checks for the agent on load

**Microphone permission denied**
- macOS will prompt for microphone access on first run — click Allow
- If you accidentally denied it: System Settings → Privacy & Security → Microphone → enable Transcriber Agent

**Port 8765 already in use**
- Another process is using the port. Find and stop it:
  ```bash
  lsof -i :8765
  ```
