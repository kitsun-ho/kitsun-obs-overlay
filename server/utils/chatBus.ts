import { randomUUID } from 'node:crypto'
import type { ChatMessage, ChatPlatform } from '~/types/chat'

type ChatListener = (message: ChatMessage) => void

class ChatBus {
  private readonly listeners = new Set<ChatListener>()

  subscribe(listener: ChatListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  publish(payload: Omit<ChatMessage, 'id' | 'sentAt'>): ChatMessage {
    const chatMessage: ChatMessage = {
      id: randomUUID(),
      sentAt: new Date().toISOString(),
      ...payload
    }

    for (const listener of this.listeners) {
      listener(chatMessage)
    }

    return chatMessage
  }

  validatePlatform(input: string): input is ChatPlatform {
    return input === 'twitch' || input === 'youtube'
  }
}

const bus = new ChatBus()

export const useChatBus = () => bus
