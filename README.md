# Gemini Avatar Bot

Proyecto independiente para probar un avatar animado conectado a Gemini antes de integrarlo a VOficina.

## Qué incluye

- Avatar tipo esfera inspirado en el video de referencia.
- Patrón animado, respiración, flotación, squash/stretch y sombra dinámica.
- Parpadeo automático y micro-movimientos de ojos.
- Seguimiento suave del cursor cuando está en `idle`.
- Estados `idle`, `listening`, `thinking`, `speaking` y `error`.
- Expresiones: `neutral`, `happy`, `excited`, `thinking`, `confused`, `surprised`, `sad`, `angry`.
- Acciones: `nod`, `shake`, `bounce`, `look_left`, `look_right`, `look_up`.
- Gemini decide `emotion`, `action` e `intensity`; React ejecuta las animaciones localmente.
- TTS del navegador para que el avatar se anime mientras habla.
- Entrada por micrófono usando Web Speech API cuando el navegador la soporta.
- Panel de prueba para disparar expresiones sin gastar llamadas a Gemini.
- API key únicamente en backend; nunca se expone al bundle de Vite.

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
idle -> listening -> thinking -> speaking -> idle
                         |
                         -> error -> idle
```

Gemini responde con una estructura como:

```json
{
  "text": "Claro, ya encontré el problema.",
  "emotion": "happy",
  "action": "nod",
  "intensity": 0.65
}
```

La IA no controla frames. Solo manda intención. El frontend mantiene las animaciones fluidas localmente.

## Archivos importantes

- `src/components/Avatar.tsx`: ojos, seguimiento del cursor, blink y mirada.
- `src/styles.css`: esfera, patrón, expresiones y keyframes.
- `src/App.tsx`: máquina de estados, chat, voz y micrófono.
- `api/server.ts`: conexión server-side con Gemini y salida estructurada.

## Integración futura a VOficina

El proyecto usa React 19, Vite 8 y TypeScript 5.9 para mantenerse cercano al stack actual de VOficina. El avatar está aislado para que luego se pueda mover a una carpeta de componentes y sustituir `/api/chat` por el endpoint real del asistente.
