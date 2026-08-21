const capabilities = [
  {
    title: 'Avance de actividades',
    description: 'Consultar cuánto falta para terminar una actividad, tarea o gestión y explicar bloqueos, fechas y responsables.',
    examples: ['¿Cuánto falta para cerrar esta gestión?', 'Dame el avance de las tareas de Milton.'],
  },
  {
    title: 'Tareas y gestiones',
    description: 'Crear, consultar, actualizar y organizar trabajo dentro del sistema cuando conectemos los servicios de VOFI.',
    examples: ['Crea una tarea para mañana.', 'Mueve esta gestión a En proceso.'],
  },
  {
    title: 'Equipos',
    description: 'Ayudar a formar equipos, consultar integrantes, responsables y distribución de trabajo.',
    examples: ['Crea un equipo para soporte.', '¿Quién está en el equipo de desarrollo?'],
  },
  {
    title: 'Comandos VOFI',
    description: 'Interpretar lenguaje natural y convertirlo en acciones controladas dentro de VOficina, con validación antes de ejecutar operaciones sensibles.',
    examples: ['Asigna esta tarea a Emiliano.', 'Genera el reporte de pendientes.'],
  },
];

export function VofiPanel() {
  return (
    <section className="workspace-card vofi-panel">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">ASISTENTE VOFI</p>
          <h1>Consultas y acciones del sistema</h1>
          <p className="workspace-subtitle">
            Esta es la base del modo operativo. Por ahora no ejecuta cambios en VOficina; deja definida la separación entre conversar, consultar datos y ejecutar comandos.
          </p>
        </div>
        <span className="workspace-status planned"><span />Integración pendiente</span>
      </header>

      <div className="vofi-capability-grid">
        {capabilities.map((capability) => (
          <article className="vofi-capability" key={capability.title}>
            <div className="vofi-capability-mark" />
            <h2>{capability.title}</h2>
            <p>{capability.description}</p>
            <div className="vofi-examples">
              {capability.examples.map((example) => <span key={example}>{example}</span>)}
            </div>
          </article>
        ))}
      </div>

      <div className="vofi-command-flow">
        <div>
          <span>1</span>
          <strong>Entender intención</strong>
          <small>Qué quiere consultar o hacer el usuario.</small>
        </div>
        <i />
        <div>
          <span>2</span>
          <strong>Resolver contexto</strong>
          <small>Empresa, sucursal, gestión, tarea, equipo o usuario.</small>
        </div>
        <i />
        <div>
          <span>3</span>
          <strong>Consultar / confirmar</strong>
          <small>Las lecturas responden; las escrituras sensibles piden confirmación.</small>
        </div>
        <i />
        <div>
          <span>4</span>
          <strong>Ejecutar en VOFI</strong>
          <small>Se conectará después a los servicios reales del sistema.</small>
        </div>
      </div>
    </section>
  );
}
