<template>
  <div class="overlay" :class="themeClass">
    <div ref="scroller" class="chat" :class="{ compact }">
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
    return
  }

  es = new EventSource(`/api/chat/sse?${params.toString()}`)

  es.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse((ev as MessageEvent).data) as ChatMessage
      if (!msg || typeof msg.id !== 'string') return

      messages.value = [...messages.value, msg].slice(-maxMessages.value)

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
    connect()
  }
)

onBeforeUnmount(() => {
  es?.close()
})
</script>

<style scoped>
.overlay {
  width: 100vw;
  height: 100vh;
  background: transparent;
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
  background: rgba(10, 10, 14, 0.55);
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
</style>
