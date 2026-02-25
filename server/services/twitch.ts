import WebSocket from 'ws'
import { bus } from '~/server/utils/bus'
import type { ChatMessage } from '~/types/chat'

interface TwitchTags {
  [key: string]: string
}

let ws: WebSocket | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let started = false

const TWITCH_URL = 'wss://irc-ws.chat.twitch.tv:443'
const RECONNECT_DELAY_MS = 2000

const twitchChannel = (process.env.TWITCH_CHANNEL || 'kitsun').trim().toLowerCase()
const twitchNick = (process.env.TWITCH_NICK || 'justinfan12345').trim()
const twitchOauth = (process.env.TWITCH_OAUTH || '').trim()

function parseTags(segment: string): TwitchTags {
  const tags: TwitchTags = {}
  for (const pair of segment.split(';')) {
    const [key, value = ''] = pair.split('=')
    tags[key] = value
  }
  return tags
}

function parsePrivmsg(rawLine: string): ChatMessage | null {
  // IRC message format example:
  // @badge-info=...;display-name=Foo;tmi-sent-ts=123 :foo!foo@foo.tmi.twitch.tv PRIVMSG #channel :hello
  const privmsgMatch = rawLine.match(/^(?:@([^ ]+) )?:([^!]+)!([^ ]+) PRIVMSG #[^ ]+ :([\s\S]*)$/)
  if (!privmsgMatch) {
    return null
  }

  const [, tagsRaw, nick, , text] = privmsgMatch
  const tags = tagsRaw ? parseTags(tagsRaw) : {}
  const ts = Number(tags['tmi-sent-ts']) || Date.now()
  const user = tags['display-name'] || nick

  return {
    id: `twitch-${ts}-${Math.random().toString(36).slice(2, 8)}`,
    ts,
    platform: 'twitch',
    user,
    text,
    raw: {
      line: rawLine,
      tags
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_DELAY_MS)
}

function sendIrcHandshake(socket: WebSocket) {
  // CAP/ PASS / NICK / JOIN must be sent after socket open.
  socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership')
  if (twitchOauth) {
    const token = twitchOauth.startsWith('oauth:') ? twitchOauth : `oauth:${twitchOauth}`
    socket.send(`PASS ${token}`)
  } else {
    // Anonymous login fallback supported by Twitch IRC.
    socket.send('PASS SCHMOOPIIE')
  }
  socket.send(`NICK ${twitchNick}`)
  socket.send(`JOIN #${twitchChannel}`)
}

function connect() {
  ws = new WebSocket(TWITCH_URL)

  ws.on('open', () => {
    console.log(`[twitch] connected to #${twitchChannel} as ${twitchNick}`)
    if (!ws) {
      return
    }
    sendIrcHandshake(ws)
  })

  ws.on('message', (buffer) => {
    const payload = buffer.toString('utf8')
    const lines = payload.split('\r\n').filter(Boolean)

    for (const line of lines) {
      if (line.startsWith('PING')) {
        ws?.send(line.replace('PING', 'PONG'))
        continue
      }

      const message = parsePrivmsg(line)
      if (message) {
        bus.publish(message)
      }
    }
  })

  ws.on('close', () => {
    console.warn('[twitch] socket closed, scheduling reconnect...')
    scheduleReconnect()
  })

  ws.on('error', (error) => {
    console.error('[twitch] socket error:', error)
    ws?.close()
  })
}

export function startTwitchService() {
  if (started) {
    return
  }
  started = true
  connect()
}

export function stopTwitchService() {
  started = false
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  ws?.close()
  ws = null
}
