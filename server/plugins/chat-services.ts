import { startTwitchService, stopTwitchService } from '~/server/services/twitch'
import { startYouTubeService, stopYouTubeService } from '~/server/services/youtube'

export default defineNitroPlugin(() => {
  startTwitchService()
  startYouTubeService()

  process.on('exit', () => {
    stopTwitchService()
    stopYouTubeService()
  })
})
