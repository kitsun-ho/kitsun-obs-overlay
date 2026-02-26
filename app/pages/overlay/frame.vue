<template>
  <div class="overlay" :class="[themeClass, { animate }]" :style="rootVars" aria-hidden="true">
    <div v-if="showOuter" class="outer" />

    <header v-if="showHeader" class="header">
      <div class="brand">
        <div class="title">{{ title }}</div>
        <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
      </div>

      <div v-if="rightText" class="right">{{ rightText }}</div>
    </header>

    <div v-if="showChatPanel" class="panel chat" :style="chatStyle">
      <div v-if="chatLabel" class="label">{{ chatLabel }}</div>
    </div>

    <div v-if="showCamFrame" class="panel cam" :style="camStyle">
      <div v-if="camLabel" class="label">{{ camLabel }}</div>
    </div>

    <footer v-if="showFooter" class="footer">
      <div class="left">{{ leftFooter }}</div>
      <div class="center">{{ centerFooter }}</div>
      <div class="right">{{ rightFooter }}</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

type FrameStorageConfig = {
  title?: string
  subtitle?: string
  right?: string
  accent?: string
  accent2?: string
  outer?: string
  header?: string
  footer?: string
  chat?: string
  cam?: string
  animate?: string
  chatLabel?: string
  camLabel?: string
  leftFooter?: string
  centerFooter?: string
  rightFooter?: string
  chatX?: string
  chatY?: string
  chatW?: string
  chatH?: string
  camX?: string
  camY?: string
  camW?: string
  camH?: string
  theme?: 'dark' | 'light'
}

type OverlayStorageV1 = {
  v: 1
  frame?: FrameStorageConfig
}

const STORAGE_KEY = 'kitsun.obsOverlay.v1'
const storedFrame = ref<FrameStorageConfig | null>(null)

type Theme = 'dark' | 'light'

function q(name: string): string | undefined {
  const value = route.query[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]

  const sv = storedFrame.value?.[name as keyof FrameStorageConfig]
  if (typeof sv === 'string') return sv
  return undefined
}

function loadStoredFrame(): FrameStorageConfig | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OverlayStorageV1
    return parsed?.frame ?? null
  } catch {
    return null
  }
}

function qBool(name: string, fallback: boolean) {
  const raw = q(name)
  if (raw === undefined) return fallback
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return fallback
}

function cssLength(value: string | undefined, fallback: string) {
  if (!value) return fallback
  const v = value.trim()
  if (!v) return fallback
  if (v.endsWith('%') || v.endsWith('px') || v.endsWith('vh') || v.endsWith('vw') || v.endsWith('rem')) return v
  const n = Number(v)
  if (Number.isFinite(n)) return `${n}px`
  return fallback
}

function cssColor(value: string | undefined, fallback: string) {
  if (!value) return fallback
  const v = value.trim()
  if (!v) return fallback
  return v
}

const theme = computed<Theme>(() => (q('theme') === 'light' ? 'light' : 'dark'))
const themeClass = computed(() => `theme-${theme.value}`)

const accent = computed(() => cssColor(q('accent'), '#a970ff'))
const accent2 = computed(() => cssColor(q('accent2'), '#00dc82'))

const title = computed(() => q('title') ?? 'STREAM')
const subtitle = computed(() => q('subtitle') ?? '')
const rightText = computed(() => q('right') ?? '')

const showOuter = computed(() => qBool('outer', true))
const showHeader = computed(() => qBool('header', true))
const showFooter = computed(() => qBool('footer', false))
const showChatPanel = computed(() => qBool('chat', true))
const showCamFrame = computed(() => qBool('cam', true))

const animate = computed(() => qBool('animate', true))

const chatLabel = computed(() => q('chatLabel') ?? 'CHAT')
const camLabel = computed(() => q('camLabel') ?? 'CAM')

const leftFooter = computed(() => q('leftFooter') ?? '')
const centerFooter = computed(() => q('centerFooter') ?? '')
const rightFooter = computed(() => q('rightFooter') ?? '')

// Default layout targets 1920x1080 canvas
const chatStyle = computed(() => {
  const x = cssLength(q('chatX'), '32px')
  const y = cssLength(q('chatY'), '120px')
  const w = cssLength(q('chatW'), '520px')
  const h = cssLength(q('chatH'), '860px')
  return { left: x, top: y, width: w, height: h }
})

const camStyle = computed(() => {
  const x = cssLength(q('camX'), '1368px')
  const y = cssLength(q('camY'), '120px')
  const w = cssLength(q('camW'), '520px')
  const h = cssLength(q('camH'), '520px')
  return { left: x, top: y, width: w, height: h }
})

const rootVars = computed(() => {
  return {
    '--accent': accent.value,
    '--accent2': accent2.value
  } as Record<string, string>
})

onMounted(() => {
  storedFrame.value = loadStoredFrame()
})
</script>

<style scoped>
.overlay {
  width: 100vw;
  height: 100vh;
  background: transparent;
  position: relative;
  pointer-events: none;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

/* Outer border */
.outer {
  position: absolute;
  inset: 20px;
  border-radius: 26px;
  border: 2px solid color-mix(in oklab, var(--accent) 70%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--accent2) 40%, transparent),
    0 0 36px color-mix(in oklab, var(--accent) 18%, transparent);
}

.animate .outer {
  animation: glow 3.2s ease-in-out infinite;
}

/* Header */
.header {
  position: absolute;
  left: 32px;
  right: 32px;
  top: 28px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: grid;
  gap: 2px;
}

.title {
  font-size: 22px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.subtitle {
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.08em;
  opacity: 0.85;
}

.right {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.9;
}

/* Panels (chat / cam frames) */
.panel {
  position: absolute;
  border-radius: 22px;
  border: 2px solid color-mix(in oklab, var(--accent) 70%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--accent2) 35%, transparent),
    0 0 30px color-mix(in oklab, var(--accent) 14%, transparent);
}

.animate .panel {
  animation: glow 3.2s ease-in-out infinite;
}

.panel::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 22px;
  background:
    radial-gradient(1200px 320px at 12% 0%, color-mix(in oklab, var(--accent2) 22%, transparent), transparent 65%),
    radial-gradient(900px 280px at 95% 10%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 55%);
  opacity: 0.9;
  pointer-events: none;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  padding: 10px;
  box-sizing: border-box;
}

.animate .panel::before {
  animation: shimmer 4.8s ease-in-out infinite;
}

.label {
  position: absolute;
  top: -12px;
  left: 18px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: color-mix(in oklab, var(--accent) 20%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 55%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Footer */
.footer {
  position: absolute;
  left: 32px;
  right: 32px;
  bottom: 28px;
  height: 48px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.9;
}

.footer .left {
  justify-self: start;
}
.footer .center {
  justify-self: center;
}
.footer .right {
  justify-self: end;
}

/* Theme colors */
.theme-dark {
  color: rgba(255, 255, 255, 0.92);
}

.theme-light {
  color: rgba(0, 0, 0, 0.82);
}

@keyframes glow {
  0%, 100% {
    filter: drop-shadow(0 0 0px color-mix(in oklab, var(--accent) 0%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 14px color-mix(in oklab, var(--accent) 28%, transparent));
  }
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
}
</style>
