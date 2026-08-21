# Kibo — arquitectura preparada para la integración con VOFI

Este documento define la base futura del asistente sin implementar todavía las pantallas, endpoints ni operaciones reales.

## Objetivo

Kibo debe evolucionar de un avatar/chat de prueba a un asistente con superficies y responsabilidades separadas. La separación es intencional para evitar acoplar funcionalidades que tienen ciclos de vida distintos.

## Superficies previstas

### 1. Chat

Modo conversacional general.

Responsabilidades futuras:

- Conversar con el usuario.
- Responder dudas.
- Ayudar a interpretar información.
- Servir como punto de entrada para solicitudes que después puedan convertirse en consultas o comandos VOFI.

El chat no debe contener lógica directa de base de datos ni ejecutar operaciones por sí mismo. Debe delegar en un router/orquestador.

### 2. Reunión / transcripción

Modo de escucha prolongada.

Responsabilidades futuras:

- Capturar audio durante una reunión.
- Mantener el estado visual `listening` del avatar.
- Producir transcripción incremental.
- Conservar segmentos con timestamps.
- Soportar identificación de hablantes cuando se conecte un motor capaz de hacerlo.
- Pausar, reanudar y finalizar una sesión.

Importante: la transcripción y la minuta son funcionalidades distintas.

Finalizar una transcripción NO debe generar automáticamente una minuta.

La transcripción puede ser una fuente para una minuta solamente cuando el usuario lo solicite explícitamente.

### 3. Minutas

Superficie independiente para generar minutas.

Fuentes posibles:

- Texto pegado manualmente.
- Notas de una reunión.
- Contexto escrito por el usuario.
- Una transcripción previamente seleccionada.

La minuta debe poder configurarse sin depender del módulo de transcripción.

Configuración prevista:

- Estilo ejecutivo.
- Estilo estándar.
- Estilo detallado.
- Contexto de la reunión.
- Participantes.
- Título opcional.

Salida base prevista:

- Título.
- Objetivo.
- Resumen.
- Decisiones.
- Acuerdos.
- Tareas.
- Responsables.
- Fechas compromiso.
- Riesgos o bloqueos.
- Próximos pasos.

Los contratos iniciales están definidos en `src/assistant/contracts.ts`.

### 4. Asistente VOFI

Superficie orientada a datos y acciones del sistema.

Debe soportar dos familias de operaciones.

#### Consultas

Ejemplos futuros:

- ¿Cuánto falta para terminar esta actividad?
- ¿Cuál es el avance de esta tarea?
- ¿Qué falta para cerrar esta gestión?
- Dame un reporte de pendientes.
- ¿Qué actividades están bloqueadas?
- ¿Quién es responsable de esta tarea?
- ¿Qué equipos existen y quién pertenece a ellos?

Estas operaciones son de lectura y pueden responder después de resolver correctamente el contexto.

#### Comandos

Ejemplos futuros:

- Crea una tarea.
- Asigna una tarea a una persona.
- Actualiza el estado de una gestión.
- Crea un equipo.
- Agrega integrantes a un equipo.
- Cambia una fecha compromiso.

Los comandos no deben ejecutarse directamente desde el texto generado por el modelo.

El flujo previsto es:

1. Interpretar intención.
2. Resolver entidad y contexto.
3. Extraer parámetros.
4. Detectar parámetros faltantes.
5. Clasificar la operación como lectura o escritura.
6. Para escrituras, presentar un plan estructurado y solicitar confirmación cuando corresponda.
7. Ejecutar mediante un adaptador VOFI explícito.
8. Devolver un resultado estructurado.

## Contexto de VOFI

La integración futura podrá recibir contexto autenticado sin mezclarlo con el prompt libre del usuario.

El contrato `AssistantRuntimeContext` ya contempla campos para:

- `idEmpresa`
- `idSucursal`
- `idUsuario`
- `locale`

Esto permitirá que el asistente opere dentro del contexto de la sesión real cuando se integre en VOFI.

## Router de capacidades

`src/assistant/capabilities.ts` contiene un registro declarativo de capacidades futuras.

Cada capacidad define:

- intención;
- superficie;
- nivel de riesgo;
- si requiere contexto VOFI;
- descripción funcional.

La intención es que en el futuro exista un orquestador similar a:

```text
entrada del usuario
        |
        v
intent router
        |
        +-- chat.message ---------> ChatService
        |
        +-- meeting.transcribe ---> MeetingService
        |
        +-- minutes.generate -----> MinutesService
        |
        +-- work.progress --------> VofiReadAdapter
        +-- work.report ----------> VofiReadAdapter
        |
        +-- task.create ----------> CommandPlanner -> confirmación -> VofiWriteAdapter
        +-- task.update ----------> CommandPlanner -> confirmación -> VofiWriteAdapter
        +-- management.* ---------> CommandPlanner -> confirmación -> VofiWriteAdapter
        +-- team.* ---------------> VofiAdapter
```

## Separación recomendada de carpetas

Cuando se implemente, la estructura recomendada es:

```text
src/
  assistant/
    contracts.ts
    capabilities.ts
    router/
    services/
      chat/
      meeting/
      minutes/
      vofi/
    adapters/
      vofi/
    state/

  features/
    chat/
    meeting/
    minutes/
    vofi-assistant/
```

No es necesario crear esas carpetas hasta que exista implementación real.

## Reglas para mantener desacoplamiento

1. El avatar refleja estado; no decide lógica de negocio.
2. Gemini interpreta y redacta; no escribe directamente en VOFI.
3. La transcripción no genera minutas automáticamente.
4. El generador de minutas acepta distintas fuentes mediante un contrato único.
5. Las consultas VOFI y los comandos VOFI usan adaptadores separados de la UI.
6. Las operaciones de escritura deben ser estructuradas y validables.
7. La UI de cada superficie debe poder evolucionar sin modificar el avatar.
8. Los datos autenticados de VOFI deben entrar como contexto estructurado, no inferirse del lenguaje natural.
9. Un reporte de avance debe devolver datos estructurados antes de que Gemini los convierta en lenguaje natural.
10. Las capacidades nuevas deben agregarse primero al registro declarativo y después conectarse a un servicio concreto.

## Estado actual

Por ahora Kibo conserva únicamente el funcionamiento existente del avatar y del chat de prueba.

No se agregó:

- generación real de minutas;
- transcripción continua;
- ejecución de comandos VOFI;
- consultas reales de tareas, actividades o gestiones;
- creación de equipos;
- nuevas pantallas activas.

Solo quedaron definidos contratos y límites arquitectónicos para que implementar estas piezas después no obligue a rehacer el bot actual.
