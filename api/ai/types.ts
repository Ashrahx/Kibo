export type AssistantEmotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'confused'
  | 'surprised'
  | 'sad'
  | 'angry';

export type AssistantAction =
  | 'none'
  | 'nod'
  | 'shake'
  | 'bounce'
  | 'look_left'
  | 'look_right'
  | 'look_up';

export type AssistantSound =
  | 'murmur'
  | 'chirp'
  | 'giggle'
  | 'grumble'
  | 'gasp'
  | 'sigh'
  | 'blep'
  | 'celebrate';

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantReply {
  text: string;
  emotion: AssistantEmotion;
  action: AssistantAction;
  sound: AssistantSound;
  intensity: number;
}

export interface AssistantRequest {
  message: string;
  history: AssistantHistoryMessage[];
  authorizedContext?: string;
}

export interface AIProviderHealth {
  connected: boolean;
  model: string;
  modelAvailable: boolean;
  error?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  health(): Promise<AIProviderHealth>;
  chat(request: AssistantRequest): Promise<AssistantReply>;
}
