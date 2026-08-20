import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { AvatarEmotion, ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  busy: boolean;
  soundEnabled: boolean;
  speechSupported: boolean;
  listening: boolean;
  onSend: (text: string) => Promise<void>;
  onToggleSound: () => void;
  onToggleListening: () => void;
  onDemoEmotion: (emotion: AvatarEmotion) => void;
}

const demoEmotions: AvatarEmotion[] = ['happy', 'excited', 'thinking', 'confused', 'surprised', 'sad', 'angry'];

export function ChatPanel({
  messages,
  busy,
  soundEnabled,
  speechSupported,
  listening,
  onSend,
  onToggleSound,
  onToggleListening,
  onDemoEmotion,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    await onSend(text);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <section className="chat-card">
      <div className="chat-header">
        <div>
          <p className="eyebrow">GEMINI AVATAR</p>
          <h1>Bot de prueba</h1>
        </div>
        <div className="header-actions">
          <button className={`mini-button ${soundEnabled ? 'active' : ''}`} onClick={onToggleSound} type="button">
            {soundEnabled ? 'Sonidos activos' : 'Sonidos apagados'}
          </button>
        </div>
      </div>

      <div className="chat-viewport" ref={viewportRef}>
        {messages.map((message) => (
          <div className={`message-row ${message.role}`} key={message.id}>
            <div className="message-bubble">
              <span className="message-label">{message.role === 'user' ? 'Tú' : 'Orb'}</span>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        {busy && (
          <div className="message-row assistant">
            <div className="message-bubble typing-bubble" aria-label="Gemini está pensando">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="expression-strip" aria-label="Prueba de expresiones y sonidos">
        <span>Probar</span>
        {demoEmotions.map((emotion) => (
          <button key={emotion} type="button" onClick={() => onDemoEmotion(emotion)}>
            {emotion}
          </button>
        ))}
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escríbele algo a Gemini..."
          rows={1}
          disabled={busy}
        />
        {speechSupported && (
          <button
            type="button"
            className={`icon-button mic-button ${listening ? 'recording' : ''}`}
            onClick={onToggleListening}
            title={listening ? 'Detener micrófono' : 'Hablar'}
          >
            <span className="mic-icon" />
          </button>
        )}
        <button type="submit" className="send-button" disabled={busy || !input.trim()}>
          Enviar
        </button>
      </form>
    </section>
  );
}
