export type AssistantSurface = 'chat' | 'meeting' | 'minutes' | 'vofi';

export type AssistantIntent =
  | 'chat.message'
  | 'meeting.transcribe'
  | 'minutes.generate'
  | 'work.progress'
  | 'work.report'
  | 'task.create'
  | 'task.update'
  | 'management.create'
  | 'management.update'
  | 'team.create'
  | 'team.read';

export interface AssistantRuntimeContext {
  idEmpresa?: string;
  idSucursal?: string;
  idUsuario?: string;
  locale?: string;
}

export interface TranscriptSegment {
  id: string;
  speakerId?: string;
  speakerName?: string;
  text: string;
  startedAtMs: number;
  endedAtMs: number;
  isFinal: boolean;
}

export interface MeetingSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: 'idle' | 'listening' | 'paused' | 'finished' | 'error';
  transcript: TranscriptSegment[];
}

export type MinuteStyle = 'executive' | 'standard' | 'detailed';
export type MinuteSourceType = 'manual' | 'notes' | 'transcript';

export interface MinuteRequest {
  sourceType: MinuteSourceType;
  sourceText: string;
  style: MinuteStyle;
  title?: string;
  context?: string;
  participants?: string[];
}

export interface MinuteTask {
  title: string;
  responsible?: string;
  dueDate?: string;
  status?: string;
}

export interface MinuteResult {
  title: string;
  objective: string;
  summary: string;
  decisions: string[];
  agreements: string[];
  tasks: MinuteTask[];
  risks: string[];
  nextSteps: string[];
}

export type VofiEntityType =
  | 'actividad'
  | 'tarea'
  | 'gestion'
  | 'equipo'
  | 'proyecto'
  | 'usuario';

export type CommandRisk = 'read' | 'write' | 'sensitive_write';

export interface CommandPlan {
  intent: AssistantIntent;
  entity?: VofiEntityType;
  risk: CommandRisk;
  requiresConfirmation: boolean;
  parameters: Record<string, unknown>;
  missingParameters: string[];
}

export interface WorkProgressReport {
  entityType: Extract<VofiEntityType, 'actividad' | 'tarea' | 'gestion' | 'proyecto'>;
  entityId: string;
  title: string;
  progressPercent?: number;
  remainingDescription: string;
  blockers: string[];
  dueDate?: string;
  responsible?: string;
  status?: string;
}

export interface TeamDraft {
  name: string;
  description?: string;
  memberIds: string[];
  responsibleId?: string;
}
