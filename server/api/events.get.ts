import { bus } from '~/server/utils/bus'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const send = (name: string, data: unknown) => {
    event.node.res.write(`event: ${name}\n`)
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  send('backlog', bus.snapshot())

  const unsubscribe = bus.subscribe((message) => {
    send('message', message)
  })

  const pingTimer = setInterval(() => {
    send('ping', { ts: Date.now() })
  }, 15_000)

  event.node.req.on('close', () => {
    unsubscribe()
    clearInterval(pingTimer)
    event.node.res.end()
  })
})
