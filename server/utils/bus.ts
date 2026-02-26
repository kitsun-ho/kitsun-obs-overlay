export type Platform = 'twitch' | 'youtube' | 'system'

export interface ChatMessage {
  id: string
  ts: number
  platform: Platform
  user: string
  text: string
  raw?: any
}

type Listener = (message: ChatMessage) => void

interface Bus {
  publish: (message: ChatMessage) => void
  subscribe: (listener: Listener) => () => void
  snapshot: () => ChatMessage[]
}

const MAX_BACKLOG = 50

function createBus(): Bus {
  const backlog: ChatMessage[] = []
  const listeners = new Set<Listener>()

  return {
    publish(message) {
      backlog.push(message)
      if (backlog.length > MAX_BACKLOG) {
        backlog.splice(0, backlog.length - MAX_BACKLOG)
      }

      for (const listener of listeners) {
        listener(message)
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    snapshot() {
      return [...backlog]
    }
  }
}

const busKey = '__chatBus__'
const globalState = globalThis as typeof globalThis & { [busKey]?: Bus }

export const bus = globalState[busKey] ?? (globalState[busKey] = createBus())

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
