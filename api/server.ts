import cors from 'cors';
import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { OllamaProvider } from './ai/ollama.provider.js';
import type { AssistantHistoryMessage } from './ai/types.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const providerName = process.env.AI_PROVIDER ?? 'ollama';

if (providerName !== 'ollama') {
  throw new Error(`AI_PROVIDER no soportado: ${providerName}. Usa AI_PROVIDER=ollama.`);
}

const ai = new OllamaProvider({
  baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
  model: process.env.OLLAMA_CHAT_MODEL ?? 'qwen3:8b',
  timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? 120_000),
  keepAlive: process.env.OLLAMA_KEEP_ALIVE ?? '10m',
});

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

app.get('/api/health', async (_req: Request, res: Response) => {
  const health = await ai.health();
  res.status(health.connected && health.modelAvailable ? 200 : 503).json({
    ok: health.connected && health.modelAvailable,
    provider: ai.name,
    model: ai.model,
    connected: health.connected,
    modelAvailable: health.modelAvailable,
    configured: true,
    localOnly: true,
    error: health.error,
  });
});

app.post('/api/chat', async (req: Request<unknown, unknown, ChatBody>, res: Response) => {
  const message = req.body.message?.trim();
  if (!message) {
    res.status(400).json({ error: 'El mensaje está vacío.' });
    return;
  }

  if (message.length > 5_000) {
    res.status(400).json({ error: 'El mensaje excede 5000 caracteres.' });
    return;
  }

  const rawHistory = Array.isArray(req.body.history) ? req.body.history : [];
  const history: AssistantHistoryMessage[] = rawHistory
    .filter((item): item is IncomingMessage => (
      item &&
      (item.role === 'user' || item.role === 'assistant') &&
      typeof item.text === 'string'
    ))
    .slice(-12)
    .map((item) => ({
      role: item.role,
      text: item.text.slice(0, 5_000),
    }));

  try {
    const reply = await ai.chat({
      message,
      history,
      authorizedContext: undefined,
    });

    res.json({
      ...reply,
      model: ai.model,
      provider: ai.name,
      localOnly: true,
    });
  } catch (error) {
    console.error('Ollama error:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : 'Error desconocido consultando Ollama.';

    res.status(502).json({ error: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Kibo API listening on http://localhost:${port}`);
  console.log(`AI provider: ${ai.name}`);
  console.log(`Local model: ${ai.model}`);
  console.log(`Ollama: ${process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'}`);
  console.log('External AI/web access: disabled by architecture');
});
