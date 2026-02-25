import { bus } from '~/server/utils/bus'

let timer: NodeJS.Timeout | null = null
let started = false

const apiKey = (process.env.YT_API_KEY || '').trim()
const liveChatId = (process.env.YT_LIVE_CHAT_ID || '').trim()

export function startYouTubeService() {
  if (started) {
    return
  }
  started = true

  if (!apiKey || !liveChatId) {
    console.info('[youtube] YouTube polling disabled (missing YT_API_KEY or YT_LIVE_CHAT_ID)')
    return
  }

  // Polling stub: keep this structure so OAuth/list API can be added later.
  timer = setInterval(() => {
    // Placeholder for future implementation:
    // 1) call liveChatMessages.list
    // 2) transform payload to ChatMessage
    // 3) bus.publish(message)
    bus.publish({
      id: `youtube-system-${Date.now()}`,
      ts: Date.now(),
      platform: 'system',
      user: 'system',
      text: 'YouTube polling stub active (replace with real polling)',
      raw: { source: 'youtube-stub' }
    })
  }, 60_000)
}

export function stopYouTubeService() {
  started = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
