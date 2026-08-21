interface MeetingPanelProps {
  active: boolean;
  onToggle: () => void;
}

export function MeetingPanel({ active, onToggle }: MeetingPanelProps) {
  return (
    <section className="workspace-card meeting-panel">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">MODO REUNIÓN</p>
          <h1>Escucha y transcripción</h1>
          <p className="workspace-subtitle">
            Base separada para capturar una reunión. La generación de minutas vive en su propio módulo.
          </p>
        </div>
        <span className={`workspace-status ${active ? 'active' : ''}`}>
          <span />
          {active ? 'Escuchando' : 'En espera'}
        </span>
      </header>

      <div className="meeting-stage">
        <div className={`meeting-listener ${active ? 'active' : ''}`} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="meeting-copy">
          <strong>{active ? 'Captura activa' : 'Listo para escuchar una reunión'}</strong>
          <p>
            {active
              ? 'El estado visual ya está preparado. La fuente de audio y el motor de transcripción continuo se conectarán aquí después.'
              : 'Este modo tendrá escucha prolongada, detección de hablantes y transcripción en tiempo real sin convertir automáticamente la reunión en una minuta.'}
          </p>
        </div>

        <button type="button" className={`meeting-toggle ${active ? 'active' : ''}`} onClick={onToggle}>
          <span className="meeting-toggle-icon" />
          {active ? 'Detener escucha' : 'Activar escucha'}
        </button>
      </div>

      <div className="meeting-transcript-shell">
        <div className="section-heading">
          <div>
            <span>Transcripción</span>
            <small>módulo independiente</small>
          </div>
          <span className="coming-soon">Base preparada</span>
        </div>
        <div className="transcript-empty">
          <span className="transcript-cursor" />
          <p>Aquí aparecerá la transcripción continua de la reunión cuando conectemos el motor de audio.</p>
        </div>
      </div>
    </section>
  );
}
