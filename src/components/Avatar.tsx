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

const neutralGazeAnchors: LookOffset[] = [
  { x: 0, y: 0 },
  { x: -8, y: -2 },
  { x: 6, y: -4 },
  { x: 9, y: 2 },
  { x: -5, y: 4 },
  { x: 3, y: 1 },
  { x: -2, y: -3 },
];

export function Avatar({ state, emotion, action, intensity }: AvatarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerTrackingRef = useRef(false);
  const [blink, setBlink] = useState(false);
  const [idleLook, setIdleLook] = useState<LookOffset>({ x: 0, y: 0 });
  const [idleLookDuration, setIdleLookDuration] = useState(420);
  const [pointerLook, setPointerLook] = useState<LookOffset>({ x: 0, y: 0 });
  const [pointerTracking, setPointerTracking] = useState(false);

  useEffect(() => {
    let blinkTimer: number;
    let blinkReleaseTimer: number;

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setBlink(true);
        blinkReleaseTimer = window.setTimeout(() => setBlink(false), 145);
        scheduleBlink();
      }, 2200 + Math.random() * 4200);
    };

    scheduleBlink();

    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(blinkReleaseTimer);
    };
  }, []);

  useEffect(() => {
    let gazeTimer: number;
    let currentAnchor = 0;

    const scheduleNextGaze = (initial = false) => {
      const wait = initial ? 1500 + Math.random() * 1000 : 1250 + Math.random() * 2200;

      gazeTimer = window.setTimeout(() => {
        if (state !== 'idle' || pointerTrackingRef.current) {
          scheduleNextGaze(false);
          return;
        }

        const candidates = neutralGazeAnchors
          .map((anchor, index) => ({ anchor, index }))
          .filter(({ index }) => index !== currentAnchor);
        const next = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];

        if (next) {
          currentAnchor = next.index;
          setIdleLookDuration(360 + Math.round(Math.random() * 220));
          setIdleLook(next.anchor);
        }

        scheduleNextGaze(false);
      }, wait);
    };

    if (state === 'idle') {
      scheduleNextGaze(true);
    } else {
      setIdleLook({ x: 0, y: 0 });
    }

    return () => window.clearTimeout(gazeTimer);
  }, [state]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!rootRef.current || state !== 'idle') {
        pointerTrackingRef.current = false;
        setPointerTracking(false);
        setPointerLook({ x: 0, y: 0 });
        return;
      }

      const box = rootRef.current.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const engagementRadius = Math.max(360, box.width * 0.95);
      const tracking = distance <= engagementRadius;

      pointerTrackingRef.current = tracking;
      setPointerTracking((current) => current === tracking ? current : tracking);

      if (!tracking) {
        setPointerLook({ x: 0, y: 0 });
        return;
      }

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
    ? pointerTracking ? pointerLook : idleLook
    : forcedLook;

  const style = {
    '--look-x': `${look.x}px`,
    '--look-y': `${look.y}px`,
    '--look-duration': `${pointerTracking ? 170 : idleLookDuration}ms`,
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
