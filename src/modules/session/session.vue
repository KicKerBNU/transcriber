<template>
  <div class="flex min-h-screen flex-col bg-gray-950">
    <!-- Top bar -->
    <div class="flex items-center justify-between border-b border-gray-800 px-6 py-4">
      <button
        class="cursor-pointer flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        @click="router.push('/dashboard')"
      >
        <FontAwesomeIcon icon="arrow-left" />
        {{ t('session.back') }}
      </button>
      <div class="flex items-center gap-4">
        <!-- Agent status indicator -->
        <div class="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            v-if="agentStatus === 'checking'"
            class="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-500"
          />
          <span
            v-else-if="agentStatus === 'connected'"
            class="inline-block h-2 w-2 rounded-full bg-green-500"
          />
          <span
            v-else
            class="inline-block h-2 w-2 rounded-full bg-red-500"
          />
          {{ agentStatusLabel }}
        </div>

        <!-- Session status -->
        <span class="text-sm font-medium text-gray-400">
          <span
            v-if="store.status === 'recording'"
            class="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500"
          />
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Pipeline diagnostic bar (agent mode, while recording) -->
    <div
      v-if="store.mode === 'agent' && store.status === 'recording'"
      class="flex items-center gap-4 border-b border-gray-800 bg-gray-900/60 px-6 py-2 text-xs text-gray-500"
    >
      <span class="font-semibold uppercase tracking-widest text-gray-600">{{ t('session.diagMode') }}</span>

      <!-- Step 1: audio from agent -->
      <span :class="store.audioBytesReceived > 0 ? 'text-green-400' : 'text-gray-600'">
        {{ t('session.diagAudio') }}: {{ (store.audioBytesReceived / 1024).toFixed(1) }} KB
        <span v-if="store.audioBytesReceived > 0" class="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
      </span>

      <!-- Step 2: events back from AssemblyAI -->
      <span :class="store.assemblyEventsReceived > 0 ? 'text-blue-400' : 'text-gray-600'">
        {{ t('session.diagEvents') }}: {{ store.assemblyEventsReceived }}
      </span>

      <!-- Warnings -->
      <span v-if="store.audioBytesReceived === 0" class="text-amber-500">
        {{ t('session.diagNoAudio') }}
      </span>
      <span
        v-else-if="store.audioBytesReceived > 51200 && store.assemblyEventsReceived === 0"
        class="text-amber-500"
      >
        {{ t('session.diagNoEvents') }}
      </span>
    </div>

    <!-- Download banner -->
    <div
      v-if="showBanner"
      class="flex items-start justify-between gap-4 border-b border-amber-500/30 bg-amber-500/10 px-6 py-4"
    >
      <div class="flex-1">
        <p class="text-sm font-semibold text-amber-300">{{ t('session.agentBannerTitle') }}</p>
        <p class="mt-0.5 text-xs text-amber-200/70">{{ t('session.agentBannerDescription') }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <a
          href="/transcriber-agent.zip"
          download
          class="cursor-pointer flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-amber-400"
        >
          <FontAwesomeIcon icon="download" />
          {{ t('session.agentBannerDownload') }}
        </a>
        <button
          class="cursor-pointer text-xs text-amber-300/60 transition hover:text-amber-200"
          @click="bannerDismissed = true"
        >
          {{ t('session.agentBannerContinue') }}
        </button>
      </div>
    </div>

    <!-- Transcript area -->
    <div ref="transcriptEl" class="flex-1 overflow-y-auto px-4 py-6">
      <div class="mx-auto max-w-2xl space-y-3">
        <div v-if="store.transcript.length === 0" class="py-24 text-center text-gray-600">
          {{ t('session.hint') }}
        </div>

        <div
          v-for="(line, i) in store.transcript"
          :key="i"
          class="flex flex-col gap-1"
          :class="line.speaker === 'ai' ? 'items-end' : 'items-start'"
        >
          <!-- Speaker label -->
          <span class="px-1 text-[10px] font-semibold uppercase tracking-widest" :class="speakerLabelClass(line.speaker)">
            {{ speakerLabel(line.speaker) }}
          </span>

          <!-- Bubble -->
          <div
            class="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
            :class="[bubbleClass(line.speaker), !line.isFinal ? 'italic opacity-60' : '']"
          >
            {{ line.text }}
            <span v-if="!line.isFinal && line.speaker === 'ai'" class="ml-1 animate-pulse">▌</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary panel -->
    <div
      v-if="store.summary"
      class="border-t border-indigo-500/30 bg-indigo-600/10 px-6 py-4"
    >
      <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-400">
        {{ t('session.summary') }}
      </p>
      <p class="text-sm text-gray-300">{{ store.summary }}</p>
    </div>

    <!-- Error banner -->
    <div
      v-if="store.error"
      class="border-t border-red-500/30 bg-red-500/10 px-6 py-3 text-sm text-red-400"
    >
      {{ store.error }}
    </div>

    <!-- Controls -->
    <div class="border-t border-gray-800 px-6 py-5">
      <div class="mx-auto flex max-w-2xl items-center justify-center gap-4">
        <!-- Start -->
        <button
          v-if="store.status === 'idle' || store.status === 'error'"
          class="cursor-pointer flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
          @click="start"
        >
          <FontAwesomeIcon icon="microphone" />
          {{ t('session.start') }}
        </button>

        <!-- Stop -->
        <button
          v-else-if="store.status === 'recording'"
          class="cursor-pointer flex items-center gap-2 rounded-full bg-red-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-red-500"
          @click="stop"
        >
          <FontAwesomeIcon icon="stop" />
          {{ t('session.stop') }}
        </button>

        <!-- Processing -->
        <button
          v-else-if="store.status === 'processing'"
          disabled
          class="flex items-center gap-2 rounded-full bg-gray-700 px-8 py-3 text-sm font-semibold text-gray-400"
        >
          <FontAwesomeIcon icon="spinner" spin />
          {{ t('session.processing') }}
        </button>

        <!-- Done — view conversation -->
        <button
          v-else-if="store.status === 'done' && savedId"
          class="cursor-pointer flex items-center gap-2 rounded-full bg-green-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
          @click="router.push(`/conversation/${savedId}`)"
        >
          <FontAwesomeIcon icon="check" />
          {{ t('session.viewConversation') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from './store/session.store'
import { useAuthStore } from '@/modules/auth/store/auth.store'

const { t } = useI18n()
const router = useRouter()
const store = useSessionStore()
const authStore = useAuthStore()

const transcriptEl = ref<HTMLElement | null>(null)
const savedId = ref<string | null>(null)
const bannerDismissed = ref(false)

type AgentStatus = 'checking' | 'connected' | 'disconnected'
const agentStatus = ref<AgentStatus>('checking')
const agentWs = ref<WebSocket | null>(null)

const showBanner = computed(
  () =>
    agentStatus.value === 'disconnected' &&
    store.status === 'idle' &&
    !bannerDismissed.value,
)

const agentStatusLabel = computed(() => ({
  checking: t('session.agentChecking'),
  connected: t('session.agentConnected'),
  disconnected: t('session.agentDisconnected'),
}[agentStatus.value]))

function connectAgent() {
  agentStatus.value = 'checking'

  const ws = new WebSocket('ws://localhost:8765')
  ws.binaryType = 'arraybuffer'
  agentWs.value = ws

  const timeout = setTimeout(() => {
    if (agentStatus.value === 'checking') {
      agentStatus.value = 'disconnected'
      ws.close()
    }
  }, 2000)

  ws.onmessage = (event) => {
    if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
      store.sendAudio(event.data)
      return
    }
    try {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'ready') {
        clearTimeout(timeout)
        agentStatus.value = 'connected'
      }
    } catch { /* ignore non-JSON */ }
  }

  ws.onerror = () => {
    clearTimeout(timeout)
    agentStatus.value = 'disconnected'
    agentWs.value = null
  }

  ws.onclose = () => {
    clearTimeout(timeout)
    agentStatus.value = 'disconnected'
    agentWs.value = null
  }
}

onMounted(() => {
  store.reset()
  connectAgent()
})

onUnmounted(() => {
  agentWs.value?.close()
  agentWs.value = null
})

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    idle: t('session.statusIdle'),
    recording: t('session.statusRecording'),
    processing: t('session.statusProcessing'),
    done: t('session.statusDone'),
    error: t('session.statusError'),
  }
  return map[store.status] ?? ''
})

watch(
  () => store.transcript.length,
  async () => {
    await nextTick()
    transcriptEl.value?.scrollTo({ top: transcriptEl.value.scrollHeight, behavior: 'smooth' })
  },
)

// ── Speaker color helpers ──────────────────────────────────────────────────

const SPEAKER_COLORS: Record<string, { bubble: string; label: string }> = {
  'Speaker A': { bubble: 'bg-indigo-600/20 text-indigo-100', label: 'text-indigo-400' },
  'Speaker B': { bubble: 'bg-emerald-600/20 text-emerald-100', label: 'text-emerald-400' },
  'Speaker C': { bubble: 'bg-amber-600/20 text-amber-100', label: 'text-amber-400' },
  'Speaker D': { bubble: 'bg-rose-600/20 text-rose-100', label: 'text-rose-400' },
  ai: { bubble: 'bg-indigo-600/20 text-indigo-100', label: 'text-indigo-400' },
  user: { bubble: 'bg-gray-800 text-gray-200', label: 'text-gray-500' },
}

const FALLBACK_COLORS = { bubble: 'bg-gray-700/40 text-gray-200', label: 'text-gray-500' }

function bubbleClass(speaker: string): string {
  return (SPEAKER_COLORS[speaker] ?? FALLBACK_COLORS).bubble
}

function speakerLabelClass(speaker: string): string {
  return (SPEAKER_COLORS[speaker] ?? FALLBACK_COLORS).label
}

function speakerLabel(speaker: string): string {
  if (speaker === 'ai') return 'AI'
  if (speaker === 'user') return 'You'
  return speaker
}

// ── Session control ────────────────────────────────────────────────────────

async function start() {
  store.reset()
  if (agentStatus.value === 'connected' && agentWs.value) {
    try {
      await store.startWithAgent()
      agentWs.value.send(JSON.stringify({ type: 'start' }))
    } catch {
      // startWithAgent sets store.error/status on failure
    }
  } else {
    store.startRecording()
  }
}

async function stop() {
  if (!authStore.user) return
  if (store.mode === 'agent' && agentWs.value?.readyState === WebSocket.OPEN) {
    agentWs.value.send(JSON.stringify({ type: 'stop' }))
  }
  savedId.value = await store.stopAndSummarize(authStore.user.uid)
}
</script>
