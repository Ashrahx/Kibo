export type AvatarState = 'idle' | 'listening' | 'thinking' | 'reacting' | 'error';

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

export type BotSound =
  | 'murmur'
  | 'chirp'
  | 'giggle'
  | 'grumble'
  | 'gasp'
  | 'sigh'
  | 'blep'
  | 'celebrate'
  | 'error';

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
  sound: BotSound;
  intensity: number;
  model?: string;
}
