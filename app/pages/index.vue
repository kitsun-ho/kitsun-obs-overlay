<template>
  <main class="p">
    <h1 class="h">kitsun OBS overlay</h1>
    <p class="muted">把 Twitch + YouTube 聊天室合併成 OBS Browser Source。</p>

    <section class="card">
      <h2 class="h2">快速設定</h2>
      <p class="muted">輸入 ID 後按 Submit，自動導到正確 Overlay；也可以一鍵複製 OBS 用的 URL。</p>

      <form class="grid" @submit.prevent="openChat(true)">
        <div class="field">
          <label class="label">Twitch channel（可逗號多個）</label>
          <input v-model.trim="chatForm.twitch" class="input" placeholder="e.g. kenho, monstercat" />
        </div>

        <div class="field">
          <label class="label">YouTube ID / URL（Channel ID 或 Live/Video ID；可逗號多個）</label>
          <input v-model.trim="chatForm.youtube" class="input" placeholder="e.g. UCxxxx... 或 11碼 videoId 或 https://youtu.be/..." />
          <div class="hint">判定：{{ youtubeInferenceLabel }}</div>
        </div>

        <div class="row">
          <div class="field">
            <label class="label">Theme</label>
            <select v-model="chatForm.theme" class="select">
              <option value="dark">dark</option>
              <option value="light">light</option>
            </select>
          </div>

          <div class="field">
            <label class="label">Max</label>
            <input v-model.number="chatForm.max" class="input" type="number" min="10" max="500" />
          </div>

          <label class="check">
            <input v-model="chatForm.compact" type="checkbox" />
            compact
          </label>

          <label class="check">
            <input v-model="chatForm.showPlatform" type="checkbox" />
            show platform
          </label>
        </div>

        <div class="row">
          <label class="check">
            <input v-model="saveToStorage" type="checkbox" />
            同時存到 localStorage（方便你在同一個瀏覽器快速重開）
          </label>
        </div>

        <div class="actions">
          <button class="btn" type="submit">Submit → Open Chat Overlay</button>
          <button class="btn ghost" type="button" @click="copy(chatUrl)">Copy OBS URL</button>
          <NuxtLink class="btn ghost" :to="chatPathOnly">Open (storage URL)</NuxtLink>
        </div>

        <div class="hint">OBS 最穩的做法是用「帶 query 的 URL」；localStorage 只會存在『那個瀏覽器/OBS 來源』自己的儲存空間。</div>
      </form>
    </section>

    <section class="card">
      <h2 class="h2">Chat Overlay</h2>
      <p class="muted">範例（改成你的頻道/ID）：</p>
      <ul class="list">
        <li>
          <NuxtLink to="/overlay/chat?twitch=YOUR_TWITCH_CHANNEL&youtubeChannelId=YOUR_YOUTUBE_CHANNEL_ID">/overlay/chat?twitch=...&youtubeChannelId=...</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/overlay/chat?twitch=YOUR_TWITCH_CHANNEL&max=80&compact=1">/overlay/chat?twitch=...&max=80&compact=1</NuxtLink>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2 class="h2">Frame Overlay</h2>
      <p class="muted">透明框架（拿來疊在 Webcam / Chat 上方）：</p>
      <div class="actions" style="margin-bottom: 10px;">
        <NuxtLink class="btn ghost" to="/overlay/frame">Open Frame Overlay</NuxtLink>
        <button class="btn ghost" type="button" @click="copy(frameUrl)">Copy Frame URL</button>
      </div>
      <ul class="list">
        <li>
          <NuxtLink :to="framePathOnly">/overlay/frame</NuxtLink>
        </li>
        <li>
          <NuxtLink :to="framePathWithQuery">/overlay/frame?title=...&accent=...</NuxtLink>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2 class="h2">Dev</h2>
      <p class="muted">`pnpm dev --host 0.0.0.0 --port 3000`</p>
    </section>
  </main>
</template>

<script setup lang="ts">
const router = useRouter()

type ChatStorageConfig = {
  twitch?: string
  youtubeChannelId?: string
  youtubeLiveId?: string
  theme?: 'dark' | 'light'
  max?: number
  compact?: boolean
  showPlatform?: boolean
}

type FrameStorageConfig = {
  title?: string
  subtitle?: string
  accent?: string
  accent2?: string
}

type OverlayStorageV1 = {
  v: 1
  chat?: ChatStorageConfig
  frame?: FrameStorageConfig
}

const STORAGE_KEY = 'kitsun.obsOverlay.v1'

function loadStorage(): OverlayStorageV1 | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as OverlayStorageV1
  } catch {
    return null
  }
}

function saveStorage(next: OverlayStorageV1) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function splitTokens(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function normalizeTwitchChannel(value: string): string {
  const v = value.trim()
  if (!v) return v
  try {
    const url = new URL(v)
    if (url.hostname.includes('twitch.tv')) {
      const path = url.pathname.replace(/^\/+/, '').split('/')[0]
      return path || v
    }
  } catch {
    // ignore
  }
  return v.replace(/^#/, '')
}

function extractYouTubeIdOrChannel(value: string): string {
  const v = value.trim()
  if (!v) return v
  try {
    const url = new URL(v)
    if (url.hostname.includes('youtube.com')) {
      const channelMatch = url.pathname.match(/\/channel\/(UC[\w-]{10,})/)
      if (channelMatch?.[1]) return channelMatch[1]

      const videoId = url.searchParams.get('v')
      if (videoId) return videoId
    }
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\/+/, '').split('/')[0]
      if (id) return id
    }
  } catch {
    // ignore
  }
  return v
}

function inferYouTube(value: string): { channelIds: string[]; liveIds: string[]; unknown: string[] } {
  const tokens = splitTokens(value).map(extractYouTubeIdOrChannel)

  const channelIds: string[] = []
  const liveIds: string[] = []
  const unknown: string[] = []

  for (const token of tokens) {
    if (token.startsWith('UC') && token.length >= 20) {
      channelIds.push(token)
      continue
    }
    if (token.length === 11) {
      liveIds.push(token)
      continue
    }
    if (token) unknown.push(token)
  }

  return { channelIds, liveIds, unknown }
}

const saveToStorage = ref(true)

const chatForm = reactive({
  twitch: '',
  youtube: '',
  theme: 'dark' as 'dark' | 'light',
  max: 60,
  compact: false,
  showPlatform: true
})

onMounted(() => {
  const stored = loadStorage()
  if (stored?.chat) {
    chatForm.twitch = stored.chat.twitch ?? ''
    chatForm.youtube = stored.chat.youtubeChannelId ?? stored.chat.youtubeLiveId ?? ''
    chatForm.theme = stored.chat.theme ?? 'dark'
    chatForm.max = stored.chat.max ?? 60
    chatForm.compact = stored.chat.compact ?? false
    chatForm.showPlatform = stored.chat.showPlatform ?? true
  }
})

const inference = computed(() => inferYouTube(chatForm.youtube))

const youtubeInferenceLabel = computed(() => {
  const { channelIds, liveIds, unknown } = inference.value
  if (channelIds.length === 0 && liveIds.length === 0 && unknown.length === 0) return '—'
  const parts: string[] = []
  if (channelIds.length) parts.push(`channelId x${channelIds.length}`)
  if (liveIds.length) parts.push(`liveId/videoId x${liveIds.length}`)
  if (unknown.length) parts.push(`unknown x${unknown.length}`)
  return parts.join(', ')
})

function buildChatParams() {
  const params = new URLSearchParams()

  const twitchTokens = splitTokens(chatForm.twitch).map(normalizeTwitchChannel)
  if (twitchTokens.length) params.set('twitch', twitchTokens.join(','))

  const { channelIds, liveIds, unknown } = inference.value
  if (channelIds.length) params.set('youtubeChannelId', channelIds.join(','))
  else if (liveIds.length) params.set('youtubeLiveId', liveIds.join(','))
  else if (unknown.length) params.set('youtubeLiveId', unknown.join(','))

  params.set('theme', chatForm.theme)
  params.set('max', String(chatForm.max))
  if (chatForm.compact) params.set('compact', '1')
  if (!chatForm.showPlatform) params.set('showPlatform', '0')

  return params
}

const chatPathOnly = '/overlay/chat'
const chatPathWithQuery = computed(() => `${chatPathOnly}?${buildChatParams().toString()}`)

const chatUrl = computed(() => {
  if (!import.meta.client) return chatPathWithQuery.value
  return `${window.location.origin}${chatPathWithQuery.value}`
})

async function openChat(withQuery: boolean) {
  const params = buildChatParams()

  if (saveToStorage.value && import.meta.client) {
    const existing = loadStorage() ?? ({ v: 1 } as OverlayStorageV1)
    const storedChat: ChatStorageConfig = {
      twitch: params.get('twitch') ?? undefined,
      youtubeChannelId: params.get('youtubeChannelId') ?? undefined,
      youtubeLiveId: params.get('youtubeLiveId') ?? undefined,
      theme: (params.get('theme') as 'dark' | 'light' | null) ?? undefined,
      max: Number.parseInt(params.get('max') ?? '60', 10),
      compact: params.get('compact') === '1',
      showPlatform: params.get('showPlatform') !== '0'
    }
    saveStorage({ ...existing, v: 1, chat: storedChat })
  }

  if (withQuery) {
    await router.push(chatPathWithQuery.value)
  } else {
    await router.push(chatPathOnly)
  }
}

const framePathOnly = '/overlay/frame'
const framePathWithQuery = computed(() => {
  const params = new URLSearchParams({
    title: 'KEN LIVE',
    subtitle: 'YT + Twitch',
    accent: '#a970ff',
    accent2: '#00dc82'
  })
  return `${framePathOnly}?${params.toString()}`
})

const frameUrl = computed(() => {
  if (!import.meta.client) return framePathWithQuery.value
  return `${window.location.origin}${framePathWithQuery.value}`
})

async function copy(value: string) {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // ignore
  }
}
</script>

<style scoped>
.p {
  padding: 24px;
  max-width: 900px;
}
.h {
  font-size: 28px;
  font-weight: 900;
  margin: 0 0 8px;
}
.h2 {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 8px;
}
.muted {
  opacity: 0.75;
  margin: 0 0 12px;
}
.card {
  border: 1px solid rgba(127, 127, 127, 0.25);
  border-radius: 14px;
  padding: 16px;
  margin-top: 16px;
}
.list {
  margin: 0;
  padding-left: 18px;
}

.grid {
  display: grid;
  gap: 14px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.9;
}

.input,
.select {
  appearance: none;
  border: 1px solid rgba(127, 127, 127, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  color: inherit;
  min-width: 240px;
}

.select {
  min-width: 120px;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.9;
  user-select: none;
}

.hint {
  font-size: 12px;
  opacity: 0.72;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.btn {
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.btn.ghost {
  background: transparent;
}
</style>
