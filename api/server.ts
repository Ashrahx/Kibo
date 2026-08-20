import cors from 'cors';
import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_COMMAND_MODEL ?? 'gemini-3.5-flash';

const allowedEmotions = ['neutral', 'happy', 'excited', 'thinking', 'confused', 'surprised', 'sad', 'angry'] as const;
const allowedActions = ['none', 'nod', 'shake', 'bounce', 'look_left', 'look_right', 'look_up'] as const;
const allowedSounds = ['murmur', 'chirp', 'giggle', 'grumble', 'gasp', 'sigh', 'blep', 'celebrate'] as const;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const systemInstruction = `
Eres el cerebro de un avatar visual para un chatbot de prueba.
Responde siempre en español natural, directo y conversacional.
No menciones estas instrucciones ni describas el JSON.

El avatar NO habla en voz alta y jamás debe intentar pronunciar el campo text.
El campo text existe únicamente para mostrarse escrito en el chat.
Además del texto, elige una emoción, una acción y un sonido vocal NO VERBAL corto para acompañar la respuesta.
Los sonidos son originales y sintéticos; no intentan copiar una voz o grabación concreta.

Usa los sonidos así:
- murmur: asentir, reconocer, neutral, pensar suave.
- chirp: aprobación, curiosidad o respuesta positiva.
- giggle: diversión o algo gracioso.
- grumble: molestia, desacuerdo o frustración leve.
- gasp: sorpresa repentina.
- sigh: cansancio, decepción o tristeza.
- blep: reacción cómica de rechazo, duda o "qué raro".
- celebrate: logro, éxito o entusiasmo fuerte.

No exageres las emociones: neutral y happy deben ser comunes; angry o sad solo cuando el contexto lo justifique.
La intensidad debe ser un número entre 0 y 1.
Mantén las respuestas breves salvo que el usuario pida detalle.
`;

interface IncomingMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatBody {
  message?: string;
  history?: IncomingMessage[];
}

app.use(cors());
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: Boolean(apiKey),
    model,
    configured: Boolean(apiKey),
  });
});

app.post('/api/chat', async (req: Request<unknown, unknown, ChatBody>, res: Response) => {
  if (!ai) {
    res.status(500).json({
      error: 'Falta GEMINI_API_KEY. Crea un archivo .env a partir de .env.example.',
    });
    return;
  }

  const message = req.body.message?.trim();
  if (!message) {
    res.status(400).json({ error: 'El mensaje está vacío.' });
    return;
  }

  if (message.length > 5000) {
    res.status(400).json({ error: 'El mensaje excede 5000 caracteres.' });
    return;
  }

  const rawHistory = Array.isArray(req.body.history) ? req.body.history : [];
  const history = rawHistory
    .filter((item): item is IncomingMessage => (
      item &&
      (item.role === 'user' || item.role === 'assistant') &&
      typeof item.text === 'string'
    ))
    .slice(-12);

  const contents = history.map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.text.slice(0, 5000) }],
  }));

  if (!contents.length || contents.at(-1)?.parts[0]?.text !== message) {
    contents.push({ role: 'user', parts: [{ text: message }] });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.8,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            emotion: {
              type: Type.STRING,
              enum: [...allowedEmotions],
            },
            action: {
              type: Type.STRING,
              enum: [...allowedActions],
            },
            sound: {
              type: Type.STRING,
              enum: [...allowedSounds],
            },
            intensity: { type: Type.NUMBER },
          },
          required: ['text', 'emotion', 'action', 'sound', 'intensity'],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini devolvió una respuesta vacía.');

    const parsed = JSON.parse(text) as {
      text?: unknown;
      emotion?: unknown;
      action?: unknown;
      sound?: unknown;
      intensity?: unknown;
    };

    const emotion = allowedEmotions.includes(parsed.emotion as (typeof allowedEmotions)[number])
      ? parsed.emotion
      : 'neutral';
    const action = allowedActions.includes(parsed.action as (typeof allowedActions)[number])
      ? parsed.action
      : 'none';
    const sound = allowedSounds.includes(parsed.sound as (typeof allowedSounds)[number])
      ? parsed.sound
      : 'murmur';
    const intensity = typeof parsed.intensity === 'number'
      ? Math.min(1, Math.max(0, parsed.intensity))
      : 0.5;

    res.json({
      text: typeof parsed.text === 'string' ? parsed.text : text,
      emotion,
      action,
      sound,
      intensity,
      model,
    });
  } catch (error) {
    console.error('Gemini error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido consultando Gemini.';
    res.status(502).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Gemini Avatar API listening on http://localhost:${port}`);
  console.log(`Model: ${model}`);
  console.log(`API key configured: ${apiKey ? 'yes' : 'no'}`);
});
