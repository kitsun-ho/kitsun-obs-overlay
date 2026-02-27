<template>
  <div class="overlay flex justify-center p-10px  bg-transparent overflow-hidden opacity-80 text-16px">
    <div class="datetime">{{ now }}</div>
  </div>
</template>


<script setup lang="ts">
const route = useRoute()

type Theme = 'dark' | 'light'

function q(name: string): string | undefined {
  const value = route.query[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

function formatDateTime(): string {
  const d = new Date()
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

const now = ref(formatDateTime())

onMounted(() => {
  setInterval(() => {
    now.value = formatDateTime()
  }, 1000)
})
</script>

<style scoped>
.overlay {
  font-family: MesloLGS Nerd Font;
}
</style>