import { bus } from '../../utils/bus'

export default defineEventHandler(async (event) => {
  const res = event.node.res

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  res.flushHeaders?.()

  const writeEvent = (name: string, data: unknown) => {
    res.write(`event: ${name}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  writeEvent('backlog', bus.snapshot())

  const unsubscribe = bus.subscribe((message) => {
    writeEvent('message', message)
  })

  const heartbeat = setInterval(() => {
    writeEvent('ping', { ts: Date.now() })
  }, 15000)

  let closed = false
  const cleanup = () => {
    if (closed) return
    closed = true
    clearInterval(heartbeat)
    unsubscribe()
    res.end()
  }

  event.node.req.on('close', cleanup)

  await new Promise<void>((resolve) => {
    event.node.req.on('close', resolve)
  })
})
