import type { BotSound } from '../types';

let audioContext: AudioContext | null = null;
const activeSources = new Set<AudioScheduledSourceNode>();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function getContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

function trackSource(source: AudioScheduledSourceNode) {
  activeSources.add(source);
  source.addEventListener('ended', () => activeSources.delete(source), { once: true });
}

function createEnvelope(
  context: AudioContext,
  destination: AudioNode,
  start: number,
  duration: number,
  gain: number,
) {
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.025, duration * 0.15));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  envelope.connect(destination);
  return envelope;
}

interface ToneOptions {
  start: number;
  duration: number;
  from: number;
  to?: number;
  type?: OscillatorType;
  gain?: number;
  formant?: number;
  q?: number;
  vibrato?: number;
}

function vocalTone(context: AudioContext, destination: AudioNode, options: ToneOptions) {
  const {
    start,
    duration,
    from,
    to = from,
    type = 'sawtooth',
    gain = 0.12,
    formant = 720,
    q = 1.2,
    vibrato = 0,
  } = options;

  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = createEnvelope(context, destination, start, duration, gain);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(30, from), start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + duration);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(formant, start);
  filter.Q.value = q;

  oscillator.connect(filter);
  filter.connect(envelope);

  if (vibrato > 0) {
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.frequency.value = 8.5;
    lfoGain.gain.value = vibrato;
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    lfo.start(start);
    lfo.stop(start + duration);
    trackSource(lfo);
  }

  oscillator.start(start);
  oscillator.stop(start + duration);
  trackSource(oscillator);
}

function noiseBurst(
  context: AudioContext,
  destination: AudioNode,
  start: number,
  duration: number,
  gain = 0.04,
  fromFrequency = 1800,
  toFrequency = 450,
) {
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = createEnvelope(context, destination, start, duration, gain);

  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(fromFrequency, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(80, toFrequency), start + duration);
  filter.Q.value = 0.8;

  source.connect(filter);
  filter.connect(envelope);
  source.start(start);
  source.stop(start + duration);
  trackSource(source);
}

function createOutput(context: AudioContext, intensity: number) {
  const compressor = context.createDynamicsCompressor();
  const master = context.createGain();
  master.gain.value = 0.6 + clamp(intensity, 0, 1) * 0.28;
  compressor.threshold.value = -18;
  compressor.knee.value = 16;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.14;
  master.connect(compressor);
  compressor.connect(context.destination);
  return master;
}

export async function primeBotAudio() {
  const context = getContext();
  if (context.state === 'suspended') await context.resume();
}

export function stopBotSounds() {
  for (const source of activeSources) {
    try {
      source.stop();
    } catch {
      // Source may already have stopped.
    }
  }
  activeSources.clear();
}

export async function playBotSound(sound: BotSound, intensity = 0.5): Promise<number> {
  const context = getContext();
  if (context.state === 'suspended') await context.resume();

  stopBotSounds();

  const output = createOutput(context, intensity);
  const now = context.currentTime + 0.015;
  const strength = 0.8 + clamp(intensity, 0, 1) * 0.45;

  switch (sound) {
    case 'murmur':
      vocalTone(context, output, { start: now, duration: 0.20, from: 185, to: 155, gain: 0.11 * strength, formant: 620, vibrato: 4 });
      vocalTone(context, output, { start: now + 0.24, duration: 0.22, from: 165, to: 135, gain: 0.095 * strength, formant: 560, vibrato: 3 });
      return 520;

    case 'chirp':
      vocalTone(context, output, { start: now, duration: 0.17, from: 250, to: 430, gain: 0.09 * strength, formant: 940, type: 'triangle', vibrato: 6 });
      vocalTone(context, output, { start: now + 0.14, duration: 0.22, from: 330, to: 520, gain: 0.085 * strength, formant: 1180, type: 'triangle', vibrato: 7 });
      return 430;

    case 'giggle': {
      const pitches = [315, 370, 325, 405];
      pitches.forEach((pitch, index) => {
        vocalTone(context, output, {
          start: now + index * 0.12,
          duration: 0.105,
          from: pitch,
          to: pitch * 1.08,
          gain: 0.075 * strength,
          formant: 1050,
          type: 'triangle',
          vibrato: 8,
        });
      });
      return 560;
    }

    case 'grumble':
      vocalTone(context, output, { start: now, duration: 0.52, from: 112, to: 74, gain: 0.13 * strength, formant: 390, q: 0.9, vibrato: 2 });
      noiseBurst(context, output, now + 0.02, 0.46, 0.027 * strength, 700, 250);
      return 590;

    case 'gasp':
      noiseBurst(context, output, now, 0.22, 0.055 * strength, 3200, 900);
      vocalTone(context, output, { start: now + 0.045, duration: 0.24, from: 205, to: 345, gain: 0.07 * strength, formant: 1180, type: 'triangle', vibrato: 5 });
      return 360;

    case 'sigh':
      vocalTone(context, output, { start: now, duration: 0.58, from: 230, to: 105, gain: 0.072 * strength, formant: 760, type: 'triangle', vibrato: 2 });
      noiseBurst(context, output, now + 0.04, 0.62, 0.038 * strength, 2100, 300);
      return 700;

    case 'blep':
      vocalTone(context, output, { start: now, duration: 0.18, from: 235, to: 155, gain: 0.12 * strength, formant: 820, q: 1.4, vibrato: 4 });
      vocalTone(context, output, { start: now + 0.12, duration: 0.30, from: 158, to: 82, gain: 0.14 * strength, formant: 510, q: 1.15, vibrato: 3 });
      noiseBurst(context, output, now + 0.18, 0.22, 0.024 * strength, 850, 280);
      return 500;

    case 'celebrate': {
      const sequence = [250, 340, 455];
      sequence.forEach((pitch, index) => {
        vocalTone(context, output, {
          start: now + index * 0.135,
          duration: 0.18,
          from: pitch,
          to: pitch * 1.35,
          gain: 0.085 * strength,
          formant: 1120,
          type: 'triangle',
          vibrato: 7,
        });
      });
      return 560;
    }

    case 'error':
      vocalTone(context, output, { start: now, duration: 0.16, from: 170, to: 125, gain: 0.11 * strength, formant: 520, type: 'square' });
      vocalTone(context, output, { start: now + 0.18, duration: 0.23, from: 145, to: 68, gain: 0.12 * strength, formant: 390, type: 'square' });
      return 500;

    default:
      return 0;
  }
}
