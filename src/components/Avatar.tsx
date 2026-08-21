import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { AvatarAction, AvatarEmotion, AvatarState } from '../types';

interface AvatarProps {
  state: AvatarState;
  emotion: AvatarEmotion;
  action: AvatarAction;
  intensity: number;
}

interface LookOffset {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function Avatar({ state, emotion, action, intensity }: AvatarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [blink, setBlink] = useState(false);
  const [idleLook, setIdleLook] = useState<LookOffset>({ x: 0, y: 0 });
  const [pointerLook, setPointerLook] = useState<LookOffset>({ x: 0, y: 0 });

  useEffect(() => {
    let blinkTimer: number;
    let lookTimer: number;

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 145);
        scheduleBlink();
      }, 2200 + Math.random() * 4200);
    };

    const scheduleLook = () => {
      lookTimer = window.setTimeout(() => {
        if (state === 'idle') {
          setIdleLook({
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 5,
          });
          window.setTimeout(() => setIdleLook({ x: 0, y: 0 }), 650 + Math.random() * 700);
        }
        scheduleLook();
      }, 1700 + Math.random() * 2600);
    };

    scheduleBlink();
    scheduleLook();

    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(lookTimer);
    };
  }, [state]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!rootRef.current || state !== 'idle') {
        setPointerLook({ x: 0, y: 0 });
        return;
      }

      const box = rootRef.current.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const weight = Math.min(1, distance / 420);

      setPointerLook({
        x: clamp((dx / distance) * 7 * weight, -7, 7),
        y: clamp((dy / distance) * 5 * weight, -5, 5),
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [state]);

  const forcedLook = useMemo<LookOffset>(() => {
    if (state === 'thinking' || emotion === 'thinking') return { x: 6, y: -7 };
    if (state === 'listening') return { x: 0, y: 1 };
    if (action === 'look_left') return { x: -10, y: 0 };
    if (action === 'look_right') return { x: 10, y: 0 };
    if (action === 'look_up') return { x: 0, y: -9 };
    return { x: 0, y: 0 };
  }, [action, emotion, state]);

  const look = state === 'idle'
    ? { x: pointerLook.x + idleLook.x, y: pointerLook.y + idleLook.y }
    : forcedLook;

  const style = {
    '--look-x': `${look.x}px`,
    '--look-y': `${look.y}px`,
    '--intensity': clamp(intensity, 0, 1).toString(),
  } as CSSProperties;

  return (
    <div className="avatar-stage" ref={rootRef} aria-label={`Avatar ${state}`}>
      <div className={`status-aura state-${state}`} />
      <div
        className={`orb state-${state} emotion-${emotion} action-${action}`}
        style={style}
      >
        <div className="orb-glow" />
        <div className="orb-highlight" />
        <div className="listening-wave" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className={`eyes ${blink ? 'is-blinking' : ''}`}>
          <span className="eye eye-left" />
          <span className="eye eye-right" />
        </div>
      </div>
      <div className="avatar-shadow" />
    </div>
  );
}
