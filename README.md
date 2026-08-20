# Gemini Avatar Bot

Proyecto independiente para probar un avatar animado conectado a Gemini antes de integrarlo a VOficina.

## Qué incluye

- Avatar tipo esfera inspirado en el video de referencia.
- Patrón animado, respiración, flotación, squash/stretch y sombra dinámica.
- Parpadeo automático y micro-movimientos de ojos.
- Seguimiento suave del cursor cuando está en `idle`.
- Estados `idle`, `listening`, `thinking`, `reacting` y `error`.
- Expresiones: `neutral`, `happy`, `excited`, `thinking`, `confused`, `surprised`, `sad`, `angry`.
- Acciones: `nod`, `shake`, `bounce`, `look_left`, `look_right`, `look_up`.
- Gemini decide `emotion`, `action`, `sound` e `intensity`; React ejecuta todo localmente.
- El avatar NO usa TTS ni pronuncia palabras.
- Motor Web Audio con vocalizaciones sintéticas originales: murmullos, risitas, gruñidos, sorpresa, suspiros y reacciones cómicas.
- Entrada por micrófono usando Web Speech API cuando el navegador la soporta. El usuario sí puede hablarle; el avatar responde con texto + sonidos no verbales.
- Panel de prueba para disparar expresiones y sonidos sin gastar llamadas a Gemini.
- API key únicamente en backend; nunca se expone al bundle de Vite.

## Sonidos disponibles

- `murmur`: asentimiento / neutral.
- `chirp`: positivo / curioso.
- `giggle`: risa corta.
- `grumble`: gruñido de molestia.
- `gasp`: sorpresa.
- `sigh`: suspiro.
- `blep`: reacción cómica de rechazo o duda.
- `celebrate`: celebración.
- `error`: sonido local para errores del cliente/API.

No se usan samples ni grabaciones de personajes existentes. Todos los sonidos se generan en tiempo real con Web Audio API.

## Instalación

Requiere Node.js 22+.

```bash
corepack enable
pnpm install
cp .env.example .env
```

Edita `.env`:

```env
GEMINI_API_KEY=TU_API_KEY
GEMINI_MEETING_MODEL=gemini-3.5-flash
GEMINI_COMMAND_MODEL=gemini-3.5-flash
PORT=3001
```

Luego:

```bash
pnpm dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:3001`

## Producción

```bash
pnpm build
```

El frontend queda en `dist/` y la API compilada en `dist-api/`.

## Flujo del avatar

```text
idle -> listening -> thinking -> reacting -> idle
                         |
                         -> error -> idle
```

Gemini responde con una estructura como:

```json
{
  "text": "Sí, ya encontré el problema.",
  "emotion": "happy",
  "action": "nod",
  "sound": "chirp",
  "intensity": 0.65
}
```

`text` solo se muestra en pantalla. Nunca se pasa a un sintetizador de voz.

## Archivos importantes

- `src/components/Avatar.tsx`: ojos, seguimiento del cursor, blink y mirada.
- `src/audio/botSounds.ts`: motor de sonidos vocales no verbales con Web Audio.
- `src/styles.css`: esfera, patrón, expresiones y keyframes.
- `src/App.tsx`: máquina de estados, chat, sonidos y micrófono.
- `api/server.ts`: conexión server-side con Gemini y salida estructurada.

## Integración futura a VOficina

El proyecto usa React 19, Vite 8 y TypeScript 5.9 para mantenerse cercano al stack actual de VOficina. El avatar y el motor de sonidos están aislados para poder moverlos después al proyecto real y sustituir `/api/chat` por el endpoint definitivo.
