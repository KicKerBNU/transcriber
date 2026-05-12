import subprocess
import threading
from pathlib import Path
from typing import Callable, Optional

TARGET_RATE  = 16_000
CHUNK_MS     = 100
CHUNK_FRAMES = TARGET_RATE * CHUNK_MS // 1000  # 1 600 samples
CHUNK_BYTES  = CHUNK_FRAMES * 2                # 3 200 bytes  (int16 mono)

_AGENT_DIR          = Path(__file__).parent
_CAPTURE_SYSTEM_BIN = _AGENT_DIR / 'capture_system'


class AudioCapture:
    """
    Streams mixed mic + system audio from the native capture_system binary
    (CoreAudio process tap + real input device, mixed in Swift at 16 kHz).
    No Python audio library required.
    """

    def __init__(self, on_chunk: Callable[[bytes], None]) -> None:
        self._on_chunk   = on_chunk
        self._running    = False
        self._proc: Optional[subprocess.Popen] = None
        self._thread: Optional[threading.Thread] = None

    @property
    def has_system_audio(self) -> bool:
        return self._proc is not None and self._proc.poll() is None

    # ── Public API ─────────────────────────────────────────────────────────────

    def start(self) -> None:
        self._running = True
        if not _CAPTURE_SYSTEM_BIN.exists():
            print('[capture] capture_system binary not found — run: npm run agent')
            return
        try:
            self._proc = subprocess.Popen(
                [str(_CAPTURE_SYSTEM_BIN)],
                stdout=subprocess.PIPE,
                stderr=None,  # stderr goes to terminal for diagnostics
            )
            self._thread = threading.Thread(target=self._read_loop, daemon=True)
            self._thread.start()
            print(f'[capture] started (pid={self._proc.pid})')
        except Exception as e:
            print(f'[capture] failed to start capture_system: {e}')
            self._proc = None

    def stop(self) -> None:
        self._running = False
        if self._proc:
            try:
                self._proc.terminate()
                self._proc.wait(timeout=2.0)
            except Exception:
                try:
                    self._proc.kill()
                except Exception:
                    pass
            self._proc = None
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None
        print('[capture] stopped')

    # ── Internal ───────────────────────────────────────────────────────────────

    def _read_loop(self) -> None:
        assert self._proc and self._proc.stdout
        buf = b''
        while self._running:
            try:
                chunk = self._proc.stdout.read(CHUNK_BYTES)
                if not chunk:
                    break
                buf += chunk
                while len(buf) >= CHUNK_BYTES:
                    self._on_chunk(buf[:CHUNK_BYTES])
                    buf = buf[CHUNK_BYTES:]
            except Exception:
                break
