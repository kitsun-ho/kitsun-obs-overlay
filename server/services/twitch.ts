import WebSocket from 'ws'
import { bus, makeId, type ChatMessage } from '../utils/bus'

interface TwitchState {
  socket: WebSocket | null
  reconnectTimer: NodeJS.Timeout | null
  running: boolean
}

const state: TwitchState = {
  socket: null,
  reconnectTimer: null,
  running: false
}

function env(name: string, fallback?: string) {
  return process.env[name] || fallback || ''
}

function parseTags(raw?: string) {
  if (!raw) return {}

  return raw
    .split(';')
    .map((entry) => entry.split('='))
    .reduce<Record<string, string>>((acc, [k, v]) => {
      if (k) acc[k] = v ?? ''
      return acc
    }, {})
}

function parsePrivmsg(line: string): ChatMessage | null {
  const match = line.match(/^@([^ ]+) :([^!]+)!.* PRIVMSG #[^ ]+ :(.+)$/)
  if (!match) return null

  const [, tagRaw, nick, text] = match
  const tags = parseTags(tagRaw)
  const ts = tags['tmi-sent-ts'] ? Number(tags['tmi-sent-ts']) : Date.now()

  return {
    id: makeId(),
    ts: Number.isFinite(ts) ? ts : Date.now(),
    platform: 'twitch',
    user: tags['display-name'] || nick,
    text,
    raw: line
  }
}

function connect() {
  const channel = env('TWITCH_CHANNEL', 'kitsun').replace(/^#/, '')
  const nick = env('TWITCH_NICK', 'justinfan12345')
  const oauth = env('TWITCH_OAUTH')
  const pass = oauth ? `oauth:${oauth.replace(/^oauth:/, '')}` : 'SCHMOOPIIE'

  console.log(`[twitch] connecting to #${channel} as ${nick}`)

  const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443')
  state.socket = socket

  socket.on('open', () => {
    console.log('[twitch] connected')
    socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership')
    socket.send(`PASS ${pass}`)
    socket.send(`NICK ${nick}`)
    socket.send(`JOIN #${channel}`)
  })

  socket.on('message', (payload) => {
    const chunk = payload.toString('utf8')
    const lines = chunk.split('\r\n').filter(Boolean)

    for (const line of lines) {
      if (line.startsWith('PING')) {
        socket.send(line.replace('PING', 'PONG'))
        continue
      }

      if (line.includes('PRIVMSG')) {
        const parsed = parsePrivmsg(line)
        if (parsed) {
          bus.publish(parsed)
        }
      }
    }
  })

  const scheduleReconnect = () => {
    if (!state.running || state.reconnectTimer) {
      return
    }

    console.log('[twitch] reconnecting in 2 seconds...')
    state.reconnectTimer = setTimeout(() => {
      state.reconnectTimer = null
      connect()
    }, 2000)
  }

  socket.on('close', () => {
    console.log('[twitch] disconnected')
    if (state.socket === socket) {
      state.socket = null
    }
    scheduleReconnect()
  })

  socket.on('error', (error) => {
    console.log('[twitch] socket error:', error.message)
  })
}

export function startTwitch() {
  if (state.running) return
  state.running = true
  connect()
}

export function stopTwitch() {
  state.running = false
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer)
    state.reconnectTimer = null
  }
  if (state.socket) {
    state.socket.close()
    state.socket = null
  }
}
