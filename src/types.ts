export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type AvatarEmotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'confused'
  | 'surprised'
  | 'sad'
  | 'angry';

export type AvatarAction =
  | 'none'
  | 'nod'
  | 'shake'
  | 'bounce'
  | 'look_left'
  | 'look_right'
  | 'look_up';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

export interface BotReply {
  text: string;
  emotion: AvatarEmotion;
  action: AvatarAction;
  intensity: number;
  model?: string;
}
