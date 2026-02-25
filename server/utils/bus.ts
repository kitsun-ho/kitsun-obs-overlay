import type { ChatMessage } from '~/types/chat'

type Listener = (message: ChatMessage) => void

const listeners = new Set<Listener>()
const backlog: ChatMessage[] = []
const MAX_BACKLOG = 50

export const bus = {
  publish(message: ChatMessage) {
    backlog.push(message)
    if (backlog.length > MAX_BACKLOG) {
      backlog.shift()
    }

    for (const listener of listeners) {
      listener(message)
    }
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  snapshot() {
    return [...backlog]
  }
}
