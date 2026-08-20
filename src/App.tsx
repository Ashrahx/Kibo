import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from './components/Avatar';
import { ChatPanel } from './components/ChatPanel';
import type {
  AvatarAction,
  AvatarEmotion,
  AvatarState,
  BotReply,
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
    text: 'Qué onda. Soy el bot de prueba. Háblame y voy a reaccionar con expresiones mientras respondo.',
  },
];

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [emotion, setEmotion] = useState<AvatarEmotion>('neutral');
  const [action, setAction] = useState<AvatarAction>('none');
  const [intensity, setIntensity] = useState(0.45);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
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

  const speak = useCallback((text: string, reply: BotReply) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) {
      setAvatarState('speaking');
      returnToIdle(1600 + Math.min(text.length * 12, 2600));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 1.03;
    utterance.pitch = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => /es[-_]MX/i.test(voice.lang))
      ?? voices.find((voice) => /^es/i.test(voice.lang));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      setAvatarState('speaking');
      setEmotion(reply.emotion);
      setAction(reply.action);
      setIntensity(reply.intensity);
    };
    utterance.onend = () => returnToIdle(600);
    utterance.onerror = () => returnToIdle(500);
    window.speechSynthesis.speak(utterance);
  }, [returnToIdle, voiceEnabled]);

  const sendMessage = useCallback(async (text: string) => {
    window.speechSynthesis?.cancel();
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
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo consultar Gemini.');

      const reply = payload as BotReply;
      setMessages((current) => [
        ...current,
        { id: uid(), role: 'assistant', text: reply.text },
      ]);
      setEmotion(reply.emotion);
      setAction(reply.action);
      setIntensity(reply.intensity);
      speak(reply.text, reply);
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
      returnToIdle(2600);
    } finally {
      setBusy(false);
    }
  }, [messages, returnToIdle, speak]);

  const toggleListening = useCallback(() => {
    if (!Recognition) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

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
      returnToIdle(1200);
    };

    setListening(true);
    setAvatarState('listening');
    setEmotion('neutral');
    setAction('none');
    setIntensity(0.55);
    recognition.start();
  }, [Recognition, busy, listening, returnToIdle, sendMessage]);

  const demoEmotion = (nextEmotion: AvatarEmotion) => {
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

    window.speechSynthesis?.cancel();
    setAvatarState(nextEmotion === 'thinking' ? 'thinking' : 'speaking');
    setEmotion(nextEmotion);
    setAction(demoAction[nextEmotion]);
    setIntensity(nextEmotion === 'excited' || nextEmotion === 'angry' ? 0.9 : 0.65);
    returnToIdle(1800);
  };

  useEffect(() => () => {
    clearResetTimer();
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
  }, []);

  return (
    <main className="app-shell">
      <div className="background-grid" />
      <section className="avatar-side">
        <div className="avatar-copy">
          <span className={`live-dot state-${avatarState}`} />
          <span>{avatarState === 'idle' ? 'Listo' : avatarState}</span>
        </div>
        <Avatar state={avatarState} emotion={emotion} action={action} intensity={intensity} />
        <div className="avatar-caption">
          <strong>{emotion}</strong>
          <span>{action === 'none' ? 'microanimaciones activas' : action}</span>
        </div>
      </section>

      <ChatPanel
        messages={messages}
        busy={busy}
        voiceEnabled={voiceEnabled}
        speechSupported={speechSupported}
        listening={listening}
        onSend={sendMessage}
        onToggleVoice={() => setVoiceEnabled((value) => !value)}
        onToggleListening={toggleListening}
        onDemoEmotion={demoEmotion}
      />
    </main>
  );
}

export default App;
