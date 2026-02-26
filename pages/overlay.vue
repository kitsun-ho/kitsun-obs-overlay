<script setup lang="ts">
import type { ChatMessage } from '../server/utils/bus'

const items = ref<ChatMessage[]>([])

const maxQueue = 30
const ttlMs = 35000

const addMessage = (message: ChatMessage) => {
  items.value.push(message)
  if (items.value.length > maxQueue) {
    items.value.splice(0, items.value.length - maxQueue)
  }
}

let source: EventSource | null = null
let gcTimer: number | null = null

onMounted(() => {
  source = new EventSource('/api/events')

  source.addEventListener('backlog', (event) => {
    const backlog = JSON.parse((event as MessageEvent).data) as ChatMessage[]
    items.value = backlog.slice(-maxQueue)
  })

  source.addEventListener('message', (event) => {
    const message = JSON.parse((event as MessageEvent).data) as ChatMessage
    addMessage(message)
  })

  source.addEventListener('ping', () => {
    // keep-alive
  })

  gcTimer = window.setInterval(() => {
    const now = Date.now()
    items.value = items.value.filter((item) => now - item.ts <= ttlMs)
  }, 1000)
})

onBeforeUnmount(() => {
  source?.close()
  if (gcTimer) {
    clearInterval(gcTimer)
  }
})

const platformBadgeClass = (platform: ChatMessage['platform']) => {
  if (platform === 'twitch') return 'bg-violet-500/30 border-violet-300/40'
  if (platform === 'youtube') return 'bg-rose-500/30 border-rose-300/40'
  return 'bg-slate-500/30 border-slate-200/40'
}
</script>

<template>
  <main class="w-screen h-screen bg-transparent flex justify-end items-end p-6 box-border">
    <ul class="w-full max-w-4xl list-none m-0 p-0 flex flex-col gap-2">
      <li
        v-for="msg in items"
        :key="msg.id"
        class="bg-black/35 border border-white/20 rounded-2xl px-3 py-2 backdrop-blur text-white leading-snug break-words"
      >
        <div class="flex items-baseline gap-2">
          <span
            class="text-xs px-2 py-0.5 rounded-full border border-white/15 uppercase tracking-wide"
            :class="platformBadgeClass(msg.platform)"
          >
            {{ msg.platform }}
          </span>
          <strong class="text-sm font-semibold">{{ msg.user }}</strong>
          <span class="text-sm">{{ msg.text }}</span>
        </div>
      </li>
    </ul>
  </main>
</template>
