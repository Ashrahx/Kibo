import { useCallback, useEffect, useRef, useState } from 'react';
import { playBotSound, playBotUtterance, primeBotAudio, stopBotSounds } from './audio/botSounds';
import { Avatar } from './components/Avatar';
import { ChatPanel } from './components/ChatPanel';
import type {
  AvatarAction,
  AvatarEmotion,
  AvatarState,
  BotReply,
  BotSound,
  ChatMessage,
} from './types';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionResultLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'Qué onda. Soy Kibo. Ahora mi cerebro corre localmente y conservo mis expresiones, gestos y sonidos.',
  },
];

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const avatarStateLabel: Record<AvatarState, string> = {
  idle: 'Listo',
  listening: 'Escuchando',
  thinking: 'Pensando',
  reacting: 'Reaccionando',
  error: 'Error',
};

const avatarStateDetail: Record<AvatarState, string> = {
  idle: 'microanimaciones activas',
  listening: 'capturando audio',
  thinking: 'procesando contexto',
  reacting: 'respondiendo',
  error: 'requiere atención',
};

const demoSoundByEmotion: Record<AvatarEmotion, BotSound> = {
  neutral: 'murmur',
  happy: 'chirp',
  excited: 'celebrate',
  thinking: 'murmur',
  confused: 'blep',
  surprised: 'gasp',
  sad: 'sigh',
  angry: 'grumble',
};

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [emotion, setEmotion] = useState<AvatarEmotion>('neutral');
  const [action, setAction] = useState<AvatarAction>('none');
  const [intensity, setIntensity] = useState(0.45);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const speechSupported = Boolean(Recognition);

  const clearResetTimer = () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const returnToIdle = useCallback((delay = 1200) => {
    clearResetTimer();
    resetTimerRef.current = window.setTimeout(() => {
      setAvatarState('idle');
      setEmotion('neutral');
      setAction('none');
      setIntensity(0.45);
    }, delay);
  }, []);

  const react = useCallback(async (reply: BotReply) => {
    setAvatarState('reacting');
    setEmotion(reply.emotion);
    setAction(reply.action);
    setIntensity(reply.intensity);

    if (!soundEnabled) {
      returnToIdle(1300);
      return;
    }

    try {
      const duration = await playBotUtterance(reply.text, reply.sound, reply.intensity);
      returnToIdle(Math.max(850, duration + 260));
    } catch {
      returnToIdle(1000);
    }
  }, [returnToIdle, soundEnabled]);

  const sendMessage = useCallback(async (text: string) => {
    stopBotSounds();
    if (soundEnabled) void primeBotAudio();

    const userMessage: ChatMessage = { id: uid(), role: 'user', text };
    const history = [...messages.filter((item) => item.id !== 'welcome'), userMessage].slice(-12);

    setMessages((current) => [...current, userMessage]);
    setBusy(true);
    setAvatarState('thinking');
    setEmotion('thinking');
    setAction('look_up');
    setIntensity(0.62);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo consultar la IA local.');

      const reply = payload as BotReply;
      setMessages((current) => [
        ...current,
        { id: uid(), role: 'assistant', text: reply.text },
      ]);
      await react(reply);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      setMessages((current) => [
        ...current,
        { id: uid(), role: 'assistant', text: `No pude responder: ${message}` },
      ]);
      setAvatarState('error');
      setEmotion('sad');
      setAction('shake');
      setIntensity(0.9);
      if (soundEnabled) void playBotSound('error', 0.9);
      returnToIdle(1800);
    } finally {
      setBusy(false);
    }
  }, [messages, react, returnToIdle, soundEnabled]);

  const toggleListening = useCallback(() => {
    if (!Recognition) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    if (soundEnabled) void primeBotAudio();
    const recognition = new Recognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    let submitted = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        submitted = true;
        void sendMessage(transcript);
      }
    };
    recognition.onend = () => {
      setListening(false);
      if (!submitted && !busy) returnToIdle(250);
    };
    recognition.onerror = () => {
      setListening(false);
      setAvatarState('error');
      if (soundEnabled) void playBotSound('error', 0.7);
      returnToIdle(1200);
    };

    setListening(true);
    setAvatarState('listening');
    setEmotion('neutral');
    setAction('none');
    setIntensity(0.55);
    recognition.start();
  }, [Recognition, busy, listening, returnToIdle, sendMessage, soundEnabled]);

  const demoEmotion = async (nextEmotion: AvatarEmotion) => {
    const demoAction: Record<AvatarEmotion, AvatarAction> = {
      neutral: 'none',
      happy: 'nod',
      excited: 'bounce',
      thinking: 'look_up',
      confused: 'look_left',
      surprised: 'bounce',
      sad: 'look_left',
      angry: 'shake',
    };

    stopBotSounds();
    clearResetTimer();
    const nextIntensity = nextEmotion === 'excited' || nextEmotion === 'angry' ? 0.9 : 0.65;
    setAvatarState(nextEmotion === 'thinking' ? 'thinking' : 'reacting');
    setEmotion(nextEmotion);
    setAction(demoAction[nextEmotion]);
    setIntensity(nextIntensity);

    if (soundEnabled) {
      try {
        const duration = await playBotSound(demoSoundByEmotion[nextEmotion], nextIntensity);
        returnToIdle(Math.max(900, duration + 420));
        return;
      } catch {
        // Fall through to visual-only timing.
      }
    }

    returnToIdle(1600);
  };

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      if (next) void primeBotAudio();
      else stopBotSounds();
      return next;
    });
  };

  useEffect(() => () => {
    clearResetTimer();
    stopBotSounds();
    recognitionRef.current?.stop();
  }, []);

  return (
    <main className="app-shell">
      <div className="background-grid" />
      <section className="avatar-side">
        <div className="avatar-copy">
          <span className={`live-dot state-${avatarState}`} />
          <span>{avatarStateLabel[avatarState]}</span>
        </div>
        <Avatar state={avatarState} emotion={emotion} action={action} intensity={intensity} />
        <div className="avatar-caption">
          <strong>{emotion}</strong>
          <span>{avatarState === 'idle' && action !== 'none' ? action : avatarStateDetail[avatarState]}</span>
        </div>
      </section>

      <ChatPanel
        messages={messages}
        busy={busy}
        soundEnabled={soundEnabled}
        speechSupported={speechSupported}
        listening={listening}
        onSend={sendMessage}
        onToggleSound={toggleSound}
        onToggleListening={toggleListening}
        onDemoEmotion={demoEmotion}
      />
    </main>
  );
}

export default App;
