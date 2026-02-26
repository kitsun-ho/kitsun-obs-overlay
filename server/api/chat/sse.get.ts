import { randomUUID } from 'node:crypto'
import type { ServerResponse } from 'node:http'
import tmi from 'tmi.js'
import type { ChatUserstate } from 'tmi.js'
import { LiveChat } from 'youtube-chat'

type Platform = 'twitch' | 'youtube' | 'system'

type ChatMessage = {
  id: string
  platform: Platform
  channel?: string
  author: {
    name: string
    color?: string
  }
  text: string
  timestamp: number
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return undefined
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function sseWrite(res: ServerResponse, payload: unknown) {
  res.write(`event: message\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const twitchChannels = splitCsv(firstString(query.twitch)).map((c) => c.replace(/^#/, ''))
  const youtubeChannelIds = splitCsv(firstString(query.youtubeChannelId ?? query.ytChannelId))
  const youtubeLiveIds = splitCsv(firstString(query.youtubeLiveId ?? query.ytLiveId))

  const res = event.node.res
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  res.write(`: connected\n\n`)

  let closed = false

  const sendSystem = (text: string) => {
    if (closed) return
    const msg: ChatMessage = {
      id: randomUUID(),
      platform: 'system',
      author: { name: 'system' },
      text,
      timestamp: Date.now()
    }
    sseWrite(res, msg)
  }

  const keepAlive = setInterval(() => {
    if (closed) return
    res.write(`: ping ${Date.now()}\n\n`)
  }, 15000)

  const cleanups: Array<() => void | Promise<void>> = []

  const closeAll = async () => {
    if (closed) return
    closed = true

    clearInterval(keepAlive)

    for (const cleanup of cleanups) {
      try {
        await cleanup()
      } catch {
        // ignore
      }
    }

    try {
      res.end()
    } catch {
      // ignore
    }
  }

  event.node.req.on('close', () => {
    void closeAll()
  })
  event.node.req.on('error', () => {
    void closeAll()
  })

  if (twitchChannels.length === 0 && youtubeChannelIds.length === 0 && youtubeLiveIds.length === 0) {
    sendSystem('No chat sources configured. Add ?twitch=CHANNEL and/or ?youtubeChannelId=CHANNEL_ID or ?youtubeLiveId=LIVE_ID')
    return
  }

  if (twitchChannels.length > 0) {
    const twitchClient = new tmi.Client({
      options: { skipMembership: true },
      connection: { secure: true, reconnect: true },
      channels: twitchChannels
    })

    twitchClient.on('connected', (addr: string, port: number) => {
      sendSystem(`Twitch connected (${addr}:${port})`) // addr/port is fine
    })

    twitchClient.on('disconnected', (reason: string) => {
      sendSystem(`Twitch disconnected (${reason ?? 'unknown'})`)
    })

    twitchClient.on('message', (channel: string, tags: ChatUserstate, message: string, self: boolean) => {
      if (self) return
      if (closed) return

      const displayName = (tags['display-name'] as string | undefined) || (tags.username as string | undefined) || 'twitch'
      const color = (tags.color as string | undefined) || undefined

      const msg: ChatMessage = {
        id: (tags.id as string | undefined) ?? randomUUID(),
        platform: 'twitch',
        channel: channel.replace(/^#/, ''),
        author: { name: displayName, color },
        text: message,
        timestamp: Date.now()
      }

      sseWrite(res, msg)
    })

    try {
      await twitchClient.connect()
      cleanups.push(async () => {
        await twitchClient.disconnect()
      })
    } catch (err) {
      sendSystem(`Twitch connect failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const youtubeInputs = [...youtubeChannelIds.map((id) => ({ kind: 'channelId' as const, id })), ...youtubeLiveIds.map((id) => ({ kind: 'liveId' as const, id }))]

  for (const input of youtubeInputs) {
    try {
      const liveChat = new LiveChat(input.kind === 'channelId' ? { channelId: input.id } : { liveId: input.id })

      liveChat.on('start', (liveId: string) => {
        sendSystem(`YouTube chat started (${liveId})`)
      })

      liveChat.on('end', (reason?: string) => {
        sendSystem(`YouTube chat ended (${reason ?? 'unknown'})`)
      })

      liveChat.on('error', (err: unknown) => {
        sendSystem(`YouTube chat error: ${err instanceof Error ? err.message : String(err)}`)
      })

      liveChat.on('chat', (chatItem: any) => {
        if (closed) return

        const authorName: string = chatItem?.author?.name ?? 'youtube'
        const messageParts: any[] = Array.isArray(chatItem?.message) ? chatItem.message : []
        const text = messageParts
          .map((part) => {
            if (typeof part?.text === 'string') return part.text
            if (typeof part?.emojiText === 'string') return part.emojiText
            return ''
          })
          .join('')

        const msg: ChatMessage = {
          id: randomUUID(),
          platform: 'youtube',
          author: { name: authorName },
          text: text || '',
          timestamp: chatItem?.timestamp instanceof Date ? chatItem.timestamp.getTime() : Date.now()
        }

        sseWrite(res, msg)
      })

      const ok = await liveChat.start()
      if (!ok) {
        sendSystem('YouTube chat failed to start. (This library does not use the official API; it can break if YouTube changes.)')
      }

      cleanups.push(() => liveChat.stop())
    } catch (err) {
      sendSystem(`YouTube init failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
})
