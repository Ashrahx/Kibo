import type { WorkspaceMode } from '../types';

interface WorkspaceNavProps {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}

const modes: Array<{ id: WorkspaceMode; label: string; description: string }> = [
  { id: 'chat', label: 'Chat', description: 'Conversar y pedir ayuda' },
  { id: 'meeting', label: 'Reunión', description: 'Escucha y transcripción' },
  { id: 'minutes', label: 'Minutas', description: 'Generación independiente' },
  { id: 'vofi', label: 'VOFI', description: 'Consultas y acciones' },
];

export function WorkspaceNav({ mode, onChange }: WorkspaceNavProps) {
  return (
    <nav className="workspace-nav" aria-label="Modos del asistente">
      {modes.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`workspace-tab ${mode === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
          title={item.description}
        >
          <span>{item.label}</span>
          <small>{item.description}</small>
        </button>
      ))}
    </nav>
  );
}
