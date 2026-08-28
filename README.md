# Kibo

Avatar-asistente local pensado para integrarse al módulo CG de VOficina.

Kibo usa Ollama en el backend y conserva el sistema visual del avatar: estados, expresiones, acciones y sonidos no verbales. React nunca habla directamente con Ollama; todas las solicitudes pasan por la API de Kibo.

## Qué incluye

- Avatar tipo esfera con microanimaciones y seguimiento del cursor.
- Parpadeo automático y movimiento neutral de ojos.
- Estados `idle`, `listening`, `thinking`, `reacting` y `error`.
- Expresiones `neutral`, `happy`, `excited`, `thinking`, `confused`, `surprised`, `sad` y `angry`.
- Acciones `nod`, `shake`, `bounce`, `look_left`, `look_right` y `look_up`.
- Ollama decide `emotion`, `action`, `sound` e `intensity`; React ejecuta la reacción visual localmente.
- El avatar no usa TTS ni pronuncia el campo `text`.
- Motor Web Audio con vocalizaciones sintéticas originales.
- Entrada por micrófono usando Web Speech API cuando el navegador la soporta.
- Estado visual `listening` preparado para la futura captura de reuniones.
- Contratos preparados para chat, reunión/transcripción, minutas y herramientas CG/VOFI.
- El backend no contiene búsqueda web ni llamadas a proveedores de IA externos.

## Arquitectura de IA

```text
React / Kibo
     |
     v
API Node de Kibo
     |
     +-- OllamaProvider ------> Ollama local
     |
     +-- CG Tools (futuro) ---> SQL Server / servicios CG
```

El frontend conserva el mismo contrato de reacción:

```json
{
  "text": "La gestión lleva 82%. Falta validar dos tareas.",
  "emotion": "happy",
  "action": "nod",
  "sound": "chirp",
  "intensity": 0.6
}
```

Esto permite cambiar el cerebro del bot sin tocar las expresiones ni las animaciones del avatar.

## Restricción de conocimiento

Kibo está configurado para trabajar como asistente interno de CG.

El prompt local establece que:

- no debe buscar en internet;
- no debe presentar conocimiento general/preentrenado como respuesta factual externa a CG;
- los datos operativos deben venir exclusivamente de `CONTEXTO_CG_AUTORIZADO`;
- si no existe contexto suficiente, debe decir que no dispone de datos en lugar de inventarlos;
- no debe generar SQL para saltarse la capa de herramientas y permisos.

En la fase actual todavía no están conectadas las herramientas reales de CG, por lo que las preguntas que requieren datos operativos deben responder que no existe contexto CG autorizado disponible. Después se inyectarán datos desde tools controladas del backend.

## Requisitos

- Node.js 22+
- pnpm
- Ollama instalado y ejecutándose localmente

## Preparar Ollama

Instala Ollama en el equipo o servidor que ejecutará Kibo y descarga el modelo configurado.

```bash
ollama pull qwen3:8b
```

Asegúrate de que Ollama esté disponible. Normalmente escucha en:

```text
http://127.0.0.1:11434
```

Puedes iniciar el servicio manualmente cuando sea necesario:

```bash
ollama serve
```

## Instalación del proyecto

```bash
corepack enable
pnpm install
cp .env.example .env
```

Configuración base:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=qwen3:8b
OLLAMA_TIMEOUT_MS=120000
OLLAMA_KEEP_ALIVE=10m
PORT=3001
```

Después:

```bash
pnpm dev
```

Frontend:

```text
http://localhost:5173
```

API:

```text
http://localhost:3001
```

Estado del proveedor local:

```text
GET http://localhost:3001/api/health
```

El health check valida que Ollama responda y que el modelo configurado esté descargado.

## Flujo del avatar

```text
idle -> listening -> thinking -> reacting -> idle
                         |
                         -> error -> idle
```

Mientras la API espera la respuesta del modelo, Kibo entra en `thinking`. Cuando Ollama devuelve el JSON estructurado, el frontend utiliza `emotion`, `action`, `sound` e `intensity` para ejecutar la reacción correspondiente.

## Sonidos disponibles

- `murmur`: asentimiento / neutral.
- `chirp`: positivo / curioso.
- `giggle`: risa corta.
- `grumble`: molestia.
- `gasp`: sorpresa.
- `sigh`: suspiro.
- `blep`: duda o reacción cómica.
- `celebrate`: celebración.
- `error`: error local del cliente/API.

Todos los sonidos se generan en tiempo real con Web Audio API.

## Archivos importantes

- `src/components/Avatar.tsx`: ojos, seguimiento del cursor, blink y mirada.
- `src/audio/botSounds.ts`: sonidos no verbales.
- `src/nonverbal.css`: expresiones actuales del avatar.
- `src/listening.css`: estado visual de escucha.
- `src/App.tsx`: estados, chat, sonidos y micrófono.
- `api/ai/types.ts`: contrato común del proveedor de IA.
- `api/ai/ollama.provider.ts`: conexión local con Ollama y salida estructurada.
- `api/server.ts`: API de Kibo.
- `src/assistant/contracts.ts`: contratos preparados para CG, minutas y reuniones.
- `src/assistant/capabilities.ts`: registro de capacidades futuras.
- `docs/assistant-architecture.md`: arquitectura prevista para la integración con CG/VOFI.

## Producción

```bash
pnpm build
```

El frontend queda en `dist/` y la API compilada en `dist-api/`.

En la integración final, Ollama y la API de Kibo deberían ejecutarse dentro de la red interna y el acceso saliente a internet puede bloquearse a nivel de infraestructura. Las consultas y escrituras de CG se implementarán mediante tools/adapters explícitos; el modelo local no tendrá acceso directo a SQL Server.
