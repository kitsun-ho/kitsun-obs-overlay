export type ChatPlatform = 'twitch' | 'youtube'

export interface ChatMessage {
  id: string
  platform: ChatPlatform
  author: string
  message: string
  sentAt: string
}
