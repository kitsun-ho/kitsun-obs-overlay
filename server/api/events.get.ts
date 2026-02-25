import { useChatBus } from '~/server/utils/chatBus'

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const bus = useChatBus()

  const sendSse = (payload: unknown, eventName = 'chat') => {
    event.node.res.write(`event: ${eventName}\n`)
    event.node.res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const unsubscribe = bus.subscribe((message) => {
    sendSse(message)
  })

  sendSse({ connected: true }, 'connected')

  const keepAlive = setInterval(() => {
    event.node.res.write(': keep-alive\n\n')
  }, 15_000)

  event.node.req.on('close', () => {
    clearInterval(keepAlive)
    unsubscribe()
  })
})
