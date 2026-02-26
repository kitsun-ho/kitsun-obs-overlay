<script setup lang="ts">
const form = reactive({
  platform: 'system',
  user: '',
  text: ''
})

const pending = ref(false)
const message = ref('')

const submit = async () => {
  pending.value = true
  message.value = ''
  try {
    await $fetch('/api/mock', {
      method: 'POST',
      body: {
        platform: form.platform,
        user: form.user,
        text: form.text
      }
    })
    form.text = ''
    message.value = 'sent'
  } catch {
    message.value = 'failed'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="min-h-screen box-border bg-transparent text-slate-100 px-4 py-8 flex justify-center">
    <section class="w-full max-w-xl bg-black/40 border border-white/15 rounded-2xl p-5 backdrop-blur">
      <h1 class="m-0 text-2xl font-semibold">Chat Mock Dashboard</h1>
      <form class="mt-5 grid gap-3" @submit.prevent="submit">
        <label class="grid gap-1 text-sm">
          Platform
          <select
            v-model="form.platform"
            class="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-base text-slate-100"
          >
            <option value="system">system</option>
            <option value="twitch">twitch</option>
            <option value="youtube">youtube</option>
          </select>
        </label>

        <label class="grid gap-1 text-sm">
          User
          <input
            v-model="form.user"
            placeholder="mock-user"
            class="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-base text-slate-100"
          >
        </label>

        <label class="grid gap-1 text-sm">
          Text
          <input
            v-model="form.text"
            placeholder="message"
            required
            class="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-base text-slate-100"
          >
        </label>

        <button
          :disabled="pending"
          type="submit"
          class="mt-1 rounded-lg px-3 py-2 text-base border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p class="mt-4 mb-0 text-sm text-slate-300">{{ message }}</p>
      <p class="mt-2 mb-0 text-sm">
        <NuxtLink to="/overlay" class="text-cyan-300 hover:text-cyan-200 underline underline-offset-3">Open overlay</NuxtLink>
      </p>
    </section>
  </main>
</template>
