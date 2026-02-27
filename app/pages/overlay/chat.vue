<template>
  <div class="overlay" :class="themeClass" :style="rootVars">
    <div ref="scroller" class="chat" :class="{ compact, animate }">
      <div v-for="m in messages" :key="m.id" class="msg" :class="m.platform">
        <span v-if="showPlatform" class="platform">{{ platformLabel(m.platform) }}</span>
        <span class="author" :style="authorStyle(m)">{{ m.author.name }}</span>
        <span v-if="m.platform !== 'system'" class="sep">:</span>
        <span class="text">{{ m.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Platform = 'twitch' | 'youtube' | 'system'

type ChatMessage = {
  id: string
  platform: Platform
  channel?: string
  author: {
    name: string
    color?: string
  }
  text: string
  timestamp: number
}

const route = useRoute()

const messages = ref<ChatMessage[]>([])
const scroller = ref<HTMLElement | null>(null)

type ChatStorageConfig = {
  twitch?: string
  youtubeChannelId?: string
  youtubeLiveId?: string
  theme?: 'dark' | 'light'
  max?: number
  compact?: boolean
  showPlatform?: boolean
  accent?: string
  accent2?: string
  animate?: boolean
}

type OverlayStorageV1 = {
  v: 1
  chat?: ChatStorageConfig
}

const STORAGE_KEY = 'kitsun.obsOverlay.v1'
const storedChat = ref<ChatStorageConfig | null>(null)

function loadStoredChat(): ChatStorageConfig | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OverlayStorageV1
    return parsed?.chat ?? null
  } catch {
    return null
  }
}

function getQueryString(name: string): string | undefined {
  const value = route.query[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

function getParam(name: keyof ChatStorageConfig, queryKey?: string): string | undefined {
  const qv = getQueryString(queryKey ?? (name as string))
  if (qv !== undefined && qv !== '') return qv
  const sv = storedChat.value?.[name]
  return typeof sv === 'string' && sv !== '' ? sv : undefined
}

function getBool(name: keyof ChatStorageConfig, queryKey: string, fallback: boolean) {
  const qv = getQueryString(queryKey)
  if (qv !== undefined) return qv === '1' || qv === 'true'
  const sv = storedChat.value?.[name]
  if (typeof sv === 'boolean') return sv
  return fallback
}

function getNumber(name: keyof ChatStorageConfig, queryKey: string, fallback: number) {
  const qv = getQueryString(queryKey)
  if (qv !== undefined) {
    const n = Number.parseInt(qv, 10)
    return Number.isFinite(n) ? n : fallback
  }
  const sv = storedChat.value?.[name]
  return typeof sv === 'number' && Number.isFinite(sv) ? sv : fallback
}

const maxMessages = computed(() => {
  const value = getNumber('max', 'max', 60)
  return Number.isFinite(value) ? Math.min(Math.max(value, 10), 500) : 60
})

const ttlSeconds = computed(() => {
  return getNumber('ttl', 'ttl', 8)
})

const _timers = new Map<string, number>()

const autoRemove = computed(() => getBool('autoRemove', 'autoRemove', true))

function scheduleRemoval(id: string) {
  // clear existing
  const existing = _timers.get(id)
  if (existing !== undefined) clearTimeout(existing)
  const t = window.setTimeout(() => removeMessage(id), ttlSeconds.value * 1000)
  _timers.set(id, t)
}

function removeMessage(id: string) {
  messages.value = messages.value.filter((m) => m.id !== id)
  const t = _timers.get(id)
  if (t !== undefined) clearTimeout(t)
  _timers.delete(id)
}

function clearAllTimers() {
  for (const t of _timers.values()) clearTimeout(t)
  _timers.clear()
}

const showPlatform = computed(() => {
  const raw = getQueryString('showPlatform')
  if (raw !== undefined) return raw === '1' || raw === 'true'
  const sv = storedChat.value?.showPlatform
  if (typeof sv === 'boolean') return sv
  return true
})

const compact = computed(() => {
  return getBool('compact', 'compact', false)
})

const theme = computed(() => {
  const raw = getQueryString('theme')
  if (raw !== undefined) return raw === 'light' ? 'light' : 'dark'
  const sv = storedChat.value?.theme
  return sv === 'light' ? 'light' : 'dark'
})

const themeClass = computed(() => `theme-${theme.value}`)

function cssColor(value: string | undefined, fallback: string) {
  if (!value) return fallback
  const v = value.trim()
  if (!v) return fallback
  return v
}

const accent = computed(() => cssColor(getParam('accent', 'accent'), '#a970ff'))
const accent2 = computed(() => cssColor(getParam('accent2', 'accent2'), '#00dc82'))

const animate = computed(() => getBool('animate', 'animate', false))

const rootVars = computed(() => {
  return {
    '--accent': accent.value,
    '--accent2': accent2.value
  } as Record<string, string>
})

function platformLabel(platform: Platform) {
  if (platform === 'twitch') return 'TW'
  if (platform === 'youtube') return 'YT'
  return ''
}

function authorStyle(message: ChatMessage) {
  if (message.platform === 'twitch' && message.author.color) {
    return { color: message.author.color }
  }
  return undefined
}

let es: EventSource | null = null

function connect() {
  if (es) {
    es.close()
    es = null
  }

  const params = new URLSearchParams()

  const twitch = getParam('twitch', 'twitch')
  const youtubeChannelId = getParam('youtubeChannelId', 'youtubeChannelId')
  const youtubeLiveId = getParam('youtubeLiveId', 'youtubeLiveId')

  if (twitch) params.set('twitch', twitch)
  if (youtubeChannelId) params.set('youtubeChannelId', youtubeChannelId)
  if (youtubeLiveId) params.set('youtubeLiveId', youtubeLiveId)

  if (!twitch && !youtubeChannelId && !youtubeLiveId) {
    messages.value = [
      {
        id: 'system-no-config',
        platform: 'system',
        author: { name: 'system' },
        text: 'No chat config. Go to / then Submit, or add query params (?twitch=...&youtubeChannelId=... ).',
        timestamp: Date.now()
      }
    ]
    // schedule removal for the system info message as well (always)
    scheduleRemoval('system-no-config')
    return
  }

  es = new EventSource(`/api/chat/sse?${params.toString()}`)

  es.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse((ev as MessageEvent).data) as ChatMessage
      if (!msg || typeof msg.id !== 'string') return

      messages.value = [...messages.value, msg].slice(-maxMessages.value)

      // system messages always auto-remove; other messages follow `autoRemove`
      if (msg.platform === 'system') {
        scheduleRemoval(msg.id)
      } else if (autoRemove.value) {
        scheduleRemoval(msg.id)
      }

      void nextTick(() => {
        if (!scroller.value) return
        scroller.value.scrollTop = scroller.value.scrollHeight
      })
    } catch {
      // ignore
    }
  })
}

onMounted(() => {
  storedChat.value = loadStoredChat()
  connect()
})

watch(
  () => route.fullPath,
  () => {
    messages.value = []
    clearAllTimers()
    connect()
  }
)

onBeforeUnmount(() => {
  es?.close()
  clearAllTimers()
})
</script>

<style scoped>
.overlay {
  width: 100vw;
  height: 100vh;
  background: rgb(0 0 0 / 20%);
  overflow: hidden;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

.chat {
  height: 100%;
  padding: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
}

.msg {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  line-height: 1.25;
  max-width: 100%;
  word-break: break-word;
}

.chat.compact .msg {
  padding: 8px 10px;
  border-radius: 12px;
}

.platform {
  font-weight: 700;
  font-size: 12px;
  opacity: 0.9;
}

.author {
  flex-shrink: 0;
  font-weight: 800;
}

.sep {
  opacity: 0.7;
}

.text {
  font-weight: 500;
}

/* Themes */
.theme-dark .msg {
  background: rgba(10, 10, 14, 0.3);
  color: rgba(255, 255, 255, 0.92);
}

.theme-light .msg {
  background: rgba(255, 255, 255, 0.75);
  color: rgba(0, 0, 0, 0.86);
}

/* Platform accents */
.msg.twitch .platform {
  color: #a970ff;
}

.msg.youtube .platform {
  color: #ff0033;
}

.msg.system {
  opacity: 0.85;
  font-size: 12px;
}

.theme-dark .msg.system {
  background: rgba(10, 10, 14, 0.35);
}

.theme-light .msg.system {
  background: rgba(255, 255, 255, 0.55);
}

/* Panel styling */
.chat {
  border-radius: 22px;
  border: 2px solid;
  border-color: color-mix(in oklab, var(--accent) 70%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--accent2) 35%, transparent),
    0 0 30px color-mix(in oklab, var(--accent) 14%, transparent);
  position: relative;
}

.chat::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 22px;
  padding: 10px;
  background:
    radial-gradient(1200px 320px at 12% 0%, color-mix(in oklab, var(--accent2) 22%, transparent), transparent 65%),
    radial-gradient(900px 280px at 95% 10%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 55%);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  pointer-events: none;
  opacity: 0.9;
  box-sizing: border-box;
  z-index: -1;
}

.chat.animate {
  animation: chat-glow 3.2s ease-in-out infinite;
}

.chat.animate::before {
  animation: chat-shimmer 4.8s ease-in-out infinite;
}

@keyframes chat-glow {
  0%, 100% {
    filter: drop-shadow(0 0 0px color-mix(in oklab, var(--accent) 0%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 14px color-mix(in oklab, var(--accent) 28%, transparent));
  }
}

@keyframes chat-shimmer {
  0%, 100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}
</style>
