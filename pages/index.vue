<script setup lang="ts">
import type { ChatMessage } from '~/types/chat'

const messages = ref<ChatMessage[]>([])
const status = ref<'connecting' | 'connected' | 'error'>('connecting')

if (import.meta.client) {
  const source = new EventSource('/api/events')

  source.addEventListener('connected', () => {
    status.value = 'connected'
  })

  source.addEventListener('chat', (event) => {
    const incoming = JSON.parse((event as MessageEvent<string>).data) as ChatMessage
    messages.value = [incoming, ...messages.value].slice(0, 30)
  })

  source.onerror = () => {
    status.value = 'error'
  }

  onBeforeUnmount(() => {
    source.close()
  })
}
</script>

<template>
  <main class="overlay">
    <header>
      <h1>Live Chat Overlay</h1>
      <p class="status" :class="status">SSE: {{ status }}</p>
    </header>

    <ul>
      <li v-for="msg in messages" :key="msg.id" :class="msg.platform">
        <span class="badge">{{ msg.platform }}</span>
        <strong>{{ msg.author }}:</strong>
        <span>{{ msg.message }}</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.overlay {
  min-height: 100vh;
  margin: 0;
  padding: 2rem;
  font-family: Inter, system-ui, sans-serif;
  color: #ffffff;
  background: radial-gradient(circle at top, #342450, #12091f 70%);
}

header {
  display: flex;
  gap: 1rem;
  align-items: baseline;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.status {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.8rem;
}

.status.connected {
  color: #81f5a9;
}

.status.error {
  color: #ff8c8c;
}

ul {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0 0;
  display: grid;
  gap: 0.6rem;
}

li {
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  backdrop-filter: blur(2px);
  background: rgba(255, 255, 255, 0.08);
}

.badge {
  margin-right: 0.5rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

li.twitch .badge {
  color: #bb86ff;
}

li.youtube .badge {
  color: #ff9f9f;
}
</style>
