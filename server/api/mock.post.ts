import { bus } from '~/server/utils/bus'
import type { Platform } from '~/types/chat'

interface MockBody {
  platform?: Platform
  user?: string
  text?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<MockBody>(event)
  const platform = body.platform ?? 'system'
  const user = body.user?.trim() || 'tester'
  const text = body.text?.trim() || 'hello from mock'

  const message = {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    platform,
    user,
    text,
    raw: { source: 'mock-api' }
  }

  bus.publish(message)
  return { ok: true, message }
})
