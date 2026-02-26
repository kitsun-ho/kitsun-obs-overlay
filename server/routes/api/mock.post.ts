import { bus, makeId, type ChatMessage, type Platform } from '../../utils/bus'

interface MockBody {
  platform?: Platform
  user?: string
  text?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<MockBody>(event)

  const platform: Platform = body.platform && ['twitch', 'youtube', 'system'].includes(body.platform)
    ? body.platform
    : 'system'

  const user = body.user?.trim() || 'mock-user'
  const text = body.text?.trim()

  if (!text) {
    throw createError({ statusCode: 400, message: 'text is required' })
  }

  const message: ChatMessage = {
    id: makeId(),
    ts: Date.now(),
    platform,
    user,
    text
  }

  bus.publish(message)

  return { ok: true }
})
