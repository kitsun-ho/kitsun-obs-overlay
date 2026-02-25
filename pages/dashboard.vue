<script setup lang="ts">
import type { Platform } from '~/types/chat'

const platform = ref<Platform>('twitch')
const user = ref('kitsun')
const text = ref('Hello from dashboard mock!')
const status = ref('')

async function submit() {
  const response = await $fetch('/api/mock', {
    method: 'POST',
    body: {
      platform: platform.value,
      user: user.value,
      text: text.value
    }
  })

  status.value = JSON.stringify(response)
}
</script>

<template>
  <main class="dashboard-root">
    <h1>Chat Aggregator Dashboard (MVP)</h1>
    <form class="mock-form" @submit.prevent="submit">
      <label>
        Platform
        <select v-model="platform">
          <option value="twitch">twitch</option>
          <option value="youtube">youtube</option>
          <option value="system">system</option>
        </select>
      </label>

      <label>
        User
        <input v-model="user" type="text" />
      </label>

      <label>
        Text
        <input v-model="text" type="text" />
      </label>

      <button type="submit">Send Mock Message</button>
    </form>

    <p class="status">{{ status }}</p>

    <p>
      Overlay URL:
      <a href="/overlay" target="_blank">http://127.0.0.1:3000/overlay</a>
    </p>
  </main>
</template>

<style scoped>
.dashboard-root {
  max-width: 760px;
  margin: 24px auto;
  font-family: Inter, system-ui, sans-serif;
}

.mock-form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
}

input,
select,
button {
  font-size: 16px;
  padding: 8px;
}

.status {
  margin-top: 16px;
  color: #111827;
  background: #f3f4f6;
  padding: 8px;
}
</style>
