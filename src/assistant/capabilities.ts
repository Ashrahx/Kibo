import type { AssistantIntent, AssistantSurface, CommandRisk } from './contracts';

export interface AssistantCapabilityDefinition {
  intent: AssistantIntent;
  surface: AssistantSurface;
  risk: CommandRisk;
  requiresVofiContext: boolean;
  description: string;
}

export const assistantCapabilities = [
  {
    intent: 'chat.message',
    surface: 'chat',
    risk: 'read',
    requiresVofiContext: false,
    description: 'Conversación general y ayuda contextual.',
  },
  {
    intent: 'meeting.transcribe',
    surface: 'meeting',
    risk: 'read',
    requiresVofiContext: false,
    description: 'Escucha prolongada y transcripción de reuniones. No genera minutas automáticamente.',
  },
  {
    intent: 'minutes.generate',
    surface: 'minutes',
    risk: 'read',
    requiresVofiContext: false,
    description: 'Genera una minuta a partir de una fuente elegida por el usuario.',
  },
  {
    intent: 'work.progress',
    surface: 'vofi',
    risk: 'read',
    requiresVofiContext: true,
    description: 'Consulta cuánto falta para terminar una actividad, tarea, gestión o proyecto.',
  },
  {
    intent: 'work.report',
    surface: 'vofi',
    risk: 'read',
    requiresVofiContext: true,
    description: 'Genera reportes de avance, responsables, fechas, pendientes y bloqueos.',
  },
  {
    intent: 'task.create',
    surface: 'vofi',
    risk: 'write',
    requiresVofiContext: true,
    description: 'Prepara la creación de una tarea dentro de VOFI.',
  },
  {
    intent: 'task.update',
    surface: 'vofi',
    risk: 'write',
    requiresVofiContext: true,
    description: 'Prepara cambios de estado, responsable, fechas o datos de una tarea.',
  },
  {
    intent: 'management.create',
    surface: 'vofi',
    risk: 'write',
    requiresVofiContext: true,
    description: 'Prepara la creación de una gestión.',
  },
  {
    intent: 'management.update',
    surface: 'vofi',
    risk: 'write',
    requiresVofiContext: true,
    description: 'Prepara cambios sobre una gestión existente.',
  },
  {
    intent: 'team.create',
    surface: 'vofi',
    risk: 'write',
    requiresVofiContext: true,
    description: 'Prepara la creación y composición de equipos.',
  },
  {
    intent: 'team.read',
    surface: 'vofi',
    risk: 'read',
    requiresVofiContext: true,
    description: 'Consulta equipos, integrantes y responsables.',
  },
] as const satisfies readonly AssistantCapabilityDefinition[];
