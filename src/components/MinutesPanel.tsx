import { FormEvent, useState } from 'react';
import type { GeneratedMinute, MinuteStyle } from '../types';

const minuteStyles: Array<{ id: MinuteStyle; label: string; description: string }> = [
  { id: 'executive', label: 'Ejecutiva', description: 'Muy breve, enfocada en decisiones y pendientes.' },
  { id: 'standard', label: 'Estándar', description: 'Balance entre contexto, acuerdos y tareas.' },
  { id: 'detailed', label: 'Detallada', description: 'Más contexto, riesgos y próximos pasos.' },
];

export function MinutesPanel() {
  const [source, setSource] = useState('');
  const [context, setContext] = useState('');
  const [style, setStyle] = useState<MinuteStyle>('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minute, setMinute] = useState<GeneratedMinute | null>(null);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    const cleanSource = source.trim();
    if (!cleanSource || loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: cleanSource, context: context.trim(), style }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo generar la minuta.');
      setMinute(payload as GeneratedMinute);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar la minuta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="workspace-card minutes-panel">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">MINUTAS</p>
          <h1>Generador de minutas</h1>
          <p className="workspace-subtitle">
            Este flujo es independiente de la transcripción. Puedes pegar notas, contexto o una transcripción cuando tú decidas usarla como fuente.
          </p>
        </div>
        <span className="workspace-status ready"><span />Independiente</span>
      </header>

      <div className="minutes-layout">
        <form className="minute-form" onSubmit={generate}>
          <label className="workspace-field">
            <span>Fuente para la minuta</span>
            <small>Notas, acuerdos, contexto o texto que quieras convertir en minuta.</small>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Ej. Se revisó el avance del proyecto, Milton comentó que..."
              rows={9}
            />
          </label>

          <label className="workspace-field">
            <span>Contexto adicional</span>
            <small>Opcional: proyecto, área, objetivo, participantes o reglas internas.</small>
            <input
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Ej. Reunión semanal de desarrollo / proyecto VOficina7"
            />
          </label>

          <div className="minute-style-picker">
            <span>Formato</span>
            <div className="minute-style-options">
              {minuteStyles.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={style === option.id ? 'active' : ''}
                  onClick={() => setStyle(option.id)}
                >
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="workspace-error">{error}</div>}

          <button type="submit" className="primary-workspace-button" disabled={!source.trim() || loading}>
            {loading ? 'Generando minuta…' : 'Generar minuta'}
          </button>
        </form>

        <div className="minute-output">
          {!minute ? (
            <div className="minute-empty">
              <span className="minute-document-icon" />
              <strong>La minuta aparecerá aquí</strong>
              <p>Gemini estructurará objetivo, resumen, decisiones, acuerdos, tareas, riesgos y próximos pasos.</p>
            </div>
          ) : (
            <article className="minute-document">
              <div className="minute-document-header">
                <span>MINUTA GENERADA</span>
                <h2>{minute.title}</h2>
                <p>{minute.objective}</p>
              </div>

              <section>
                <h3>Resumen</h3>
                <p>{minute.summary}</p>
              </section>

              <MinuteList title="Decisiones" items={minute.decisions} />
              <MinuteList title="Acuerdos" items={minute.agreements} />

              <section>
                <h3>Tareas</h3>
                {minute.tasks.length ? (
                  <div className="minute-task-list">
                    {minute.tasks.map((task, index) => (
                      <div className="minute-task" key={`${task.task}-${index}`}>
                        <strong>{task.task}</strong>
                        <span>{task.responsible || 'Sin responsable'}</span>
                        <small>{task.dueDate || 'Sin fecha'} · {task.status || 'Pendiente'}</small>
                      </div>
                    ))}
                  </div>
                ) : <p className="minute-muted">Sin tareas detectadas.</p>}
              </section>

              <MinuteList title="Riesgos / bloqueos" items={minute.risks} />
              <MinuteList title="Próximos pasos" items={minute.nextSteps} />
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

function MinuteList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      ) : <p className="minute-muted">Sin elementos detectados.</p>}
    </section>
  );
}
