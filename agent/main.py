import asyncio
import json
import sys
from typing import Optional

import websockets
from websockets.asyncio.server import ServerConnection

from capture import AudioCapture

HOST = '127.0.0.1'
PORT = 8765

import re

# Server binds to 127.0.0.1 only, so only local processes can connect.
# We still validate the origin to block cross-site WebSocket hijacking,
# accepting any localhost/127.0.0.1 port and the production domain.
_ALLOWED_ORIGIN_RE = re.compile(
    r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$'
)


class AgentServer:
    def __init__(self) -> None:
        self._client: Optional[ServerConnection] = None
        self._capture: Optional[AudioCapture] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._audio_q: asyncio.Queue = asyncio.Queue()

    # ── Audio thread → asyncio bridge ──────────────────────────────────────

    def _on_audio_chunk(self, pcm: bytes) -> None:
        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._audio_q.put_nowait, pcm)

    async def _stream_audio(self) -> None:
        while True:
            chunk = await self._audio_q.get()
            if chunk is None:  # stop sentinel
                break
            if self._client is not None:
                try:
                    await self._client.send(chunk)
                except Exception:
                    break

    # ── Helpers ────────────────────────────────────────────────────────────

    async def _send(self, data: dict) -> None:
        if self._client is not None:
            try:
                await self._client.send(json.dumps(data))
            except Exception:
                pass

    async def _stop_capture(self, audio_task: Optional[asyncio.Task]) -> None:
        if self._capture is not None:
            self._capture.stop()
            self._capture = None
        if audio_task is not None and not audio_task.done():
            await self._audio_q.put(None)
            try:
                await asyncio.wait_for(audio_task, timeout=2.0)
            except asyncio.TimeoutError:
                audio_task.cancel()

    # ── WebSocket handler ──────────────────────────────────────────────────

    async def handle(self, websocket: ServerConnection) -> None:
        origin = websocket.request.headers.get('Origin', '')
        if not _ALLOWED_ORIGIN_RE.match(origin):
            await websocket.close(1008, 'Forbidden origin')
            return

        if self._client is not None:
            await websocket.close(1008, 'Already connected')
            return

        self._client = websocket
        self._loop = asyncio.get_running_loop()
        print(f'[agent] client connected (origin: {origin})')

        await self._send({'type': 'ready'})

        audio_task: Optional[asyncio.Task] = None

        try:
            async for raw in websocket:
                try:
                    cmd = json.loads(raw)
                except Exception:
                    continue

                cmd_type = cmd.get('type')

                if cmd_type == 'start':
                    if self._capture is None:
                        self._capture = AudioCapture(on_chunk=self._on_audio_chunk)
                        self._capture.start()
                        audio_task = asyncio.create_task(self._stream_audio())
                        await self._send({
                            'type': 'started',
                            'systemAudio': self._capture.has_system_audio,
                        })

                elif cmd_type == 'stop':
                    await self._stop_capture(audio_task)
                    audio_task = None
                    await self._send({'type': 'stopped'})

                elif cmd_type == 'ping':
                    await self._send({'type': 'pong'})

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self._stop_capture(audio_task)
            self._client = None
            print('[agent] client disconnected')

    # ── Entry point ────────────────────────────────────────────────────────

    async def serve(self) -> None:
        print(f'[agent] listening on ws://{HOST}:{PORT}')
        async with websockets.serve(self.handle, HOST, PORT):
            await asyncio.Future()  # run until cancelled


if __name__ == '__main__':
    server = AgentServer()
    try:
        asyncio.run(server.serve())
    except KeyboardInterrupt:
        print('\n[agent] stopped.')
        sys.exit(0)
