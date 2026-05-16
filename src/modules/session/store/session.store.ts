import { defineStore } from 'pinia'
import { ref } from 'vue'
import OpenAI from 'openai'
import { saveConversation } from '../api/session.api'
import type { TranscriptLine, SessionStatus, SessionMode } from '../domain/session.types'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

const WHISPER_INTERVAL_MS = 5000
const WHISPER_MIN_BYTES = 16000
const WHISPER_RMS_THRESHOLD = 100
const WHISPER_NO_SPEECH_THRESHOLD = 0.8
/** Ignore Whisper lang hints from tiny/noisy chunks and avoid overwriting after first solid detection */
const WHISPER_MIN_CHARS_FOR_LANG = 12

/** Limits OpenAI payload per reply; full transcript remains in-memory and Firestore */
const MAX_STREAM_CONTEXT_LINES = 72
const MAX_STREAM_CONTEXT_CHARS = 28_000

/** Trim only the summarize API input — full transcript lines are still persisted */
const MAX_SUMMARY_TRANSCRIPT_CHARS = 96_000

const FALLBACK_SUMMARY =
  'Summary could not be generated (AI service limit or error). Your full transcript was saved.'

function formatLanguageForPrompt(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

/** Most recent finalized lines fitting a rough character budget (avoids context-length failures). */
function tailForChatContext(lines: TranscriptLine[]): TranscriptLine[] {
  const tail = lines.slice(-MAX_STREAM_CONTEXT_LINES)
  let sum = 0
  const acc: TranscriptLine[] = []
  for (let i = tail.length - 1; i >= 0; i--) {
    const line = tail[i]!
    const add = line.text.length + 32
    if (acc.length > 0 && sum + add > MAX_STREAM_CONTEXT_CHARS) break
    sum += add
    acc.unshift(line)
  }
  return acc
}

export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('idle')
  const mode = ref<SessionMode>('mic-only')
  const transcript = ref<TranscriptLine[]>([])
  const summary = ref<string | null>(null)
  const error = ref<string | null>(null)
  const aiStreamingText = ref('')
  const audioBytesReceived = ref(0)
  const assemblyEventsReceived = ref(0)
  const detectedLanguage = ref<string | null>(null)

  let recognition: SpeechRecognitionInstance | null = null

  // Whisper pipeline buffers
  let _audioBuffer: ArrayBuffer[] = []     // flushed every WHISPER_INTERVAL_MS
  let _recordingBuffer: ArrayBuffer[] = [] // full session — for WAV download


  let _whisperTimer: ReturnType<typeof setInterval> | null = null
  let _whispering = false

  // ── Mic-only mode (Web Speech API) ────────────────────────────────────────

  function _startWebSpeechRecognition(): boolean {
    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition
    if (!SpeechRecognitionClass) return false

    recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = ''

    let interimId: number | null = null

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript.trim()
        if (result.isFinal) {
          if (interimId !== null) { transcript.value.splice(interimId, 1); interimId = null }
          transcript.value.push({ speaker: 'user', text, timestamp: new Date(), isFinal: true })
          streamAiResponse(text)
        } else {
          const line: TranscriptLine = { speaker: 'user', text, timestamp: new Date(), isFinal: false }
          if (interimId !== null) { transcript.value[interimId] = line }
          else { interimId = transcript.value.length; transcript.value.push(line) }
        }
      }
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn('[session] Web Speech API error:', e.error)
      if (e.error === 'not-allowed') {
        error.value = 'Microphone access was denied.'
        status.value = 'error'
      }
    }

    recognition.start()
    return true
  }

  function startRecording() {
    transcript.value = []; summary.value = null; error.value = null
    status.value = 'recording'
    if (!_startWebSpeechRecognition()) {
      error.value = 'Speech recognition is not supported in this browser.'
      status.value = 'error'
    }
  }

  // ── Agent mode (browser mic + system audio → Whisper) ─────────────────────

  async function startWithAgent(): Promise<void> {
    mode.value = 'agent'
    transcript.value = []; summary.value = null; error.value = null
    aiStreamingText.value = ''
    _audioBuffer = []; _recordingBuffer = []
    _whispering = false
    audioBytesReceived.value = 0; assemblyEventsReceived.value = 0; detectedLanguage.value = null

    status.value = 'recording'
    _whisperTimer = setInterval(_flushToWhisper, WHISPER_INTERVAL_MS)
  }

  // System audio from the native agent (supplementary — mixed in alongside mic)
  function sendAudio(data: Blob | ArrayBuffer): void {
    if (data instanceof ArrayBuffer) {
      _audioBuffer.push(data)
      _recordingBuffer.push(data)
    } else {
      data.arrayBuffer().then(buf => {
        _audioBuffer.push(buf)
        _recordingBuffer.push(buf)
      })
    }
  }

  function downloadRecording(): void {
    if (_recordingBuffer.length === 0) return
    const wav = _createWav(_recordingBuffer)
    const url = URL.createObjectURL(wav)
    const a = document.createElement('a')
    a.href = url
    a.download = `recording-${Date.now()}.wav`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Whisper transcription ──────────────────────────────────────────────────

  async function _flushToWhisper(): Promise<void> {
    if (_whispering || _audioBuffer.length === 0) return

    const chunks = _audioBuffer.splice(0)
    const totalBytes = chunks.reduce((sum, b) => sum + b.byteLength, 0)
    if (totalBytes < WHISPER_MIN_BYTES) return
    if (_rms(chunks) < WHISPER_RMS_THRESHOLD) return

    _whispering = true
    try {
      const wav = _createWav(chunks)
      const file = new File([wav], 'audio.wav', { type: 'audio/wav' })

      const result = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        response_format: 'verbose_json',
      })

      const verbose = result as unknown as { language?: string; segments?: { no_speech_prob: number; text: string }[] }
      const segments = verbose.segments ?? []
      const speech = segments.filter(s => s.no_speech_prob < WHISPER_NO_SPEECH_THRESHOLD)
      const text = (speech.length ? speech.map(s => s.text).join(' ') : result.text ?? '').trim()

      // Only lock language from chunks with enough transcribed speech — avoids tail/noise flushes
      // overwriting a correct detection right before summarize (common mis-guess: Spanish).
      if (
        verbose.language &&
        text.length >= WHISPER_MIN_CHARS_FOR_LANG &&
        detectedLanguage.value === null
      ) {
        detectedLanguage.value = verbose.language
      }

      console.log(`[whisper] lang=${verbose.language} rms=${_rms(chunks).toFixed(0)} text="${text}"`)

      if (text) {
        assemblyEventsReceived.value++
        transcript.value.push({ speaker: 'user', text, timestamp: new Date(), isFinal: true })
        streamAiResponse(text)
      }
    } catch (e) {
      console.error('[session] Whisper error:', e)
    } finally {
      _whispering = false
    }
  }

  function _rms(chunks: ArrayBuffer[]): number {
    let sumSq = 0, count = 0
    for (const c of chunks) {
      const s = new Int16Array(c)
      for (let i = 0; i < s.length; i++) { sumSq += s[i] * s[i]; count++ }
    }
    return count > 0 ? Math.sqrt(sumSq / count) : 0
  }

  function _createWav(chunks: ArrayBuffer[]): Blob {
    const sr = 16000, ch = 1, bps = 16
    const pcmBytes = chunks.reduce((s, b) => s + b.byteLength, 0)
    const buf = new ArrayBuffer(44 + pcmBytes)
    const v = new DataView(buf)
    const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    str(0, 'RIFF'); v.setUint32(4, 36 + pcmBytes, true); str(8, 'WAVE')
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
    v.setUint16(22, ch, true); v.setUint32(24, sr, true)
    v.setUint32(28, (sr * ch * bps) / 8, true); v.setUint16(32, (ch * bps) / 8, true)
    v.setUint16(34, bps, true); str(36, 'data'); v.setUint32(40, pcmBytes, true)
    let off = 44; const out = new Uint8Array(buf)
    for (const c of chunks) { out.set(new Uint8Array(c), off); off += c.byteLength }
    return new Blob([buf], { type: 'audio/wav' })
  }

  // ── AI response ────────────────────────────────────────────────────────────

  async function streamAiResponse(_userText: string) {
    void _userText // Latest user utterance is already the last finalized line in context
    const aiLine: TranscriptLine = { speaker: 'ai', text: '', timestamp: new Date(), isFinal: false }
    transcript.value.push(aiLine)
    const idx = transcript.value.length - 1

    try {
      const contextLines = tailForChatContext(transcript.value.filter(l => l.isFinal))
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o',
        stream: true,
        messages: [
          {
            role: 'system',
            content: [
              'You are an active listening AI conversation partner.',
              'Respond thoughtfully and concisely. Keep responses under 3 sentences.',
              'Only the tail of long conversations appears here — infer context from recent turns.',
              detectedLanguage.value
                ? `You MUST respond in ${formatLanguageForPrompt(detectedLanguage.value)} — the same language being spoken.`
                : 'Detect the language from the user message and respond in that exact same language.',
            ].join(' '),
          },
          ...contextLines.map(l => ({
            role: l.speaker === 'ai' ? ('assistant' as const) : ('user' as const),
            content: l.speaker !== 'user' && l.speaker !== 'ai' ? `[${l.speaker}] ${l.text}` : l.text,
          })),
        ],
      })

      let full = ''
      for await (const chunk of stream) {
        full += chunk.choices[0]?.delta?.content ?? ''
        transcript.value[idx] = { ...transcript.value[idx], text: full }
      }
      transcript.value[idx] = { ...transcript.value[idx], isFinal: true }
    } catch {
      transcript.value[idx] = { ...transcript.value[idx], text: '[AI response failed]', isFinal: true }
    }
  }

  // ── Stop & summarize ───────────────────────────────────────────────────────

  async function stopAndSummarize(userId: string): Promise<string | null> {
    if (recognition) { recognition.stop(); recognition = null }

    if (_whisperTimer !== null) {
      clearInterval(_whisperTimer)
      _whisperTimer = null
      await _flushToWhisper()
    }

    downloadRecording()

    status.value = 'processing'

    const finalLines = transcript.value.filter(l => l.isFinal)
    if (finalLines.length === 0) { status.value = 'idle'; return null }

    const transcriptText = finalLines
      .map(l => `${l.speaker === 'ai' ? 'AI' : l.speaker}: ${l.text}`)
      .join('\n')

    let textForSummarize = transcriptText
    if (textForSummarize.length > MAX_SUMMARY_TRANSCRIPT_CHARS) {
      textForSummarize =
        '[Earlier messages omitted due to length. The transcript on file is complete. Summarize only what follows from the recent portion.]\n\n' +
        transcriptText.slice(-MAX_SUMMARY_TRANSCRIPT_CHARS)
    }

    let summaryText = FALLBACK_SUMMARY
    try {
      const langName = detectedLanguage.value ? formatLanguageForPrompt(detectedLanguage.value) : null
      const summarySystemParts = [
        'Summarize the following conversation in 2-4 sentences, capturing the key topics and outcomes.',
        langName
          ? `Primary hint: audio was classified as ${langName}. Write the summary in ${langName} unless the transcript text is clearly written in another language — then match the transcript.`
          : 'Write the summary in the same language as the conversation transcript below.',
      ]

      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: summarySystemParts.join(' ') },
          { role: 'user', content: textForSummarize },
        ],
      })

      const raw = (res.choices[0]?.message?.content ?? '').trim()
      if (raw) summaryText = raw
    } catch {
      summaryText = FALLBACK_SUMMARY
    }

    summary.value = summaryText

    try {
      const id = await saveConversation(userId, finalLines, summaryText)
      error.value = null
      status.value = 'done'
      return id
    } catch (e: unknown) {
      error.value = (e as Error).message
      status.value = 'error'
      return null
    }
  }

  function reset() {
    if (recognition) { recognition.stop(); recognition = null }
    if (_whisperTimer !== null) { clearInterval(_whisperTimer); _whisperTimer = null }
    _audioBuffer = []; _recordingBuffer = []; _whispering = false
    mode.value = 'mic-only'; status.value = 'idle'
    transcript.value = []; summary.value = null; error.value = null
    aiStreamingText.value = ''; audioBytesReceived.value = 0
    assemblyEventsReceived.value = 0; detectedLanguage.value = null
  }

  return {
    status, mode, transcript, summary, error, aiStreamingText,
    audioBytesReceived, assemblyEventsReceived, detectedLanguage,
    startRecording, startWithAgent, sendAudio, downloadRecording, stopAndSummarize, reset,
  }
})
