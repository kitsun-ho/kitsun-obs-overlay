<script setup lang="ts">
import type { ChatMessage } from '~/types/chat'

const messages = ref<ChatMessage[]>([])
const MAX_MESSAGES = 30
const EXPIRE_MS = 35_000
let source: EventSource | null = null
let cleanupTimer: number | null = null

function pushMessage(message: ChatMessage) {
  messages.value.push(message)
  if (messages.value.length > MAX_MESSAGES) {
    messages.value.shift()
  }
}

onMounted(() => {
  source = new EventSource('/api/events')

  source.addEventListener('backlog', (event) => {
    const payload = JSON.parse((event as MessageEvent).data) as ChatMessage[]
    messages.value = payload.slice(-MAX_MESSAGES)
  })

  source.addEventListener('message', (event) => {
    const payload = JSON.parse((event as MessageEvent).data) as ChatMessage
    pushMessage(payload)
  })

  // ping event is intentionally ignored by UI; it keeps the SSE alive.
  source.addEventListener('ping', () => {})

  cleanupTimer = window.setInterval(() => {
    const now = Date.now()
    messages.value = messages.value.filter((msg) => now - msg.ts <= EXPIRE_MS)
  }, 1000)
})

onBeforeUnmount(() => {
  source?.close()
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer)
  }
})
</script>

<template>
  <main class="overlay-root">
    <ul class="chat-list">
      <li v-for="msg in messages" :key="msg.id" class="chat-item">
        <span class="badge" :data-platform="msg.platform">{{ msg.platform }}</span>
        <span class="user">{{ msg.user }}:</span>
        <span class="text">{{ msg.text }}</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
:global(html, body, #__nuxt) {
  margin: 0;
  padding: 0;
  background: transparent;
}

.overlay-root {
  min-height: 100vh;
  background: transparent;
  color: #fff;
  font-family: Inter, 'Noto Sans TC', system-ui, sans-serif;
  padding: 16px;
}

.chat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-item {
  font-size: 26px;
  line-height: 1.3;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
}

.badge {
  display: inline-block;
  min-width: 70px;
  text-align: center;
  margin-right: 8px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 2px 10px;
  vertical-align: middle;
  color: #fff;
}

.badge[data-platform='twitch'] {
  background: #9146ff;
}

.badge[data-platform='youtube'] {
  background: #ff0000;
}

.badge[data-platform='system'] {
  background: #4b5563;
}

.user {
  font-weight: 700;
  margin-right: 6px;
}
</style>
