import type { ChatPlatform } from '~/types/chat'
import { useChatBus } from '~/server/utils/chatBus'

interface ChatPayload {
  platform: ChatPlatform
  author: string
  message: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<ChatPayload>>(event)

  if (!body.platform || !body.author || !body.message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'platform, author, message are required'
    })
  }

  const bus = useChatBus()

  if (!bus.validatePlatform(body.platform)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'platform must be twitch or youtube'
    })
  }

  const chatMessage = bus.publish({
    platform: body.platform,
    author: body.author,
    message: body.message
  })

  return {
    ok: true,
    chatMessage
  }
})
