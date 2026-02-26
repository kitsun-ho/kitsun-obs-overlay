import { startTwitch, stopTwitch } from '../services/twitch'
import { startYouTube, stopYouTube } from '../services/youtube'

export default defineNitroPlugin((nitroApp) => {
  startTwitch()
  startYouTube()

  nitroApp.hooks.hookOnce('close', () => {
    stopTwitch()
    stopYouTube()
  })
})
