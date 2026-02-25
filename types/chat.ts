export type Platform = 'twitch' | 'youtube' | 'system'

export interface ChatMessage {
  id: string
  ts: number
  platform: Platform
  user: string
  text: string
  raw?: unknown
}
