let timer: NodeJS.Timeout | null = null
let running = false

export function startYouTube() {
  if (running) return
  running = true

  const apiKey = process.env.YT_API_KEY
  const liveChatId = process.env.YT_LIVE_CHAT_ID

  if (!apiKey || !liveChatId) {
    console.log('[youtube] YouTube polling disabled')
    return
  }

  console.log('[youtube] polling started (stub)')

  timer = setInterval(() => {
    console.log('[youtube] polling tick (stub)')
  }, 30000)
}

export function stopYouTube() {
  running = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
