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
  const attack = Math.min(0.018, duration * 0.18);
  const releaseStart = Math.max(start + attack, start + duration * 0.58);

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
  envelope.gain.setValueAtTime(Math.max(0.0002, gain * 0.82), releaseStart);
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

  master.gain.value = 0.52 + clamp(intensity, 0, 1) * 0.24;
  compressor.threshold.value = -20;
  compressor.knee.value = 18;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.14;

  master.connect(compressor);
  compressor.connect(context.destination);
  return master;
}

interface VocalUnit {
  vowel: string;
  pauseAfter: number;
  emphasis: number;
}

const punctuationPause: Record<string, number> = {
  ',': 0.065,
  ';': 0.09,
  ':': 0.09,
  '.': 0.14,
  '!': 0.12,
  '?': 0.12,
};

function tokenizeVocalUnits(text: string): VocalUnit[] {
  const tokens = text.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+|[.,!?;:]/g) ?? [];
  const units: VocalUnit[] = [];

  for (const token of tokens) {
    if (punctuationPause[token]) {
      const last = units.at(-1);
      if (last) {
        last.pauseAfter += punctuationPause[token];
        if (token === '!' || token === '?') last.emphasis = Math.max(last.emphasis, 1.2);
      }
      continue;
    }

    const vowelGroups = token.match(/[aeiouáéíóúü]+/gi) ?? [token];
    const uppercaseBoost = token.length > 1 && token === token.toUpperCase() ? 1.12 : 1;

    vowelGroups.forEach((vowel, index) => {
      units.push({
        vowel: vowel.toLowerCase(),
        pauseAfter: index === vowelGroups.length - 1 ? 0.032 : 0.012,
        emphasis: uppercaseBoost,
      });
    });
  }

  return units.slice(0, 120);
}

function seedFromText(value: string, index: number) {
  let seed = 17 + index * 31;
  for (const char of value) seed = (seed * 33 + char.charCodeAt(0)) >>> 0;
  return seed;
}

function formantForVowel(vowel: string) {
  const normalized = vowel.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('i')) return 1180;
  if (normalized.includes('e')) return 930;
  if (normalized.includes('a')) return 760;
  if (normalized.includes('o')) return 590;
  if (normalized.includes('u')) return 470;
  return 720;
}

interface SpeechProfile {
  basePitch: number;
  pitchRange: number;
  duration: number;
  formantShift: number;
  gain: number;
  vibrato: number;
  glide: number;
  type: OscillatorType;
  breath: number;
}

const speechProfiles: Record<BotSound, SpeechProfile> = {
  murmur: {
    basePitch: 165,
    pitchRange: 55,
    duration: 0.105,
    formantShift: -80,
    gain: 0.072,
    vibrato: 3,
    glide: 0.94,
    type: 'sawtooth',
    breath: 0.004,
  },
  chirp: {
    basePitch: 245,
    pitchRange: 125,
    duration: 0.088,
    formantShift: 150,
    gain: 0.064,
    vibrato: 6,
    glide: 1.09,
    type: 'triangle',
    breath: 0.002,
  },
  giggle: {
    basePitch: 285,
    pitchRange: 155,
    duration: 0.076,
    formantShift: 180,
    gain: 0.058,
    vibrato: 8,
    glide: 1.12,
    type: 'triangle',
    breath: 0.003,
  },
  grumble: {
    basePitch: 92,
    pitchRange: 42,
    duration: 0.12,
    formantShift: -180,
    gain: 0.085,
    vibrato: 2,
    glide: 0.91,
    type: 'sawtooth',
    breath: 0.009,
  },
  gasp: {
    basePitch: 220,
    pitchRange: 150,
    duration: 0.09,
    formantShift: 230,
    gain: 0.058,
    vibrato: 4,
    glide: 1.16,
    type: 'triangle',
    breath: 0.012,
  },
  sigh: {
    basePitch: 145,
    pitchRange: 55,
    duration: 0.125,
    formantShift: -40,
    gain: 0.055,
    vibrato: 2,
    glide: 0.88,
    type: 'triangle',
    breath: 0.014,
  },
  blep: {
    basePitch: 175,
    pitchRange: 95,
    duration: 0.104,
    formantShift: 20,
    gain: 0.078,
    vibrato: 4,
    glide: 0.86,
    type: 'sawtooth',
    breath: 0.006,
  },
  celebrate: {
    basePitch: 255,
    pitchRange: 175,
    duration: 0.078,
    formantShift: 210,
    gain: 0.065,
    vibrato: 7,
    glide: 1.14,
    type: 'triangle',
    breath: 0.003,
  },
  error: {
    basePitch: 125,
    pitchRange: 48,
    duration: 0.115,
    formantShift: -220,
    gain: 0.075,
    vibrato: 1,
    glide: 0.78,
    type: 'square',
    breath: 0.004,
  },
};

function scheduleVocalUnit(
  context: AudioContext,
  output: AudioNode,
  unit: VocalUnit,
  sound: BotSound,
  start: number,
  index: number,
  intensity: number,
) {
  const profile = speechProfiles[sound];
  const seed = seedFromText(unit.vowel, index);
  const random01 = (seed % 1000) / 1000;
  const pitchVariation = (random01 - 0.5) * profile.pitchRange;
  const phraseWave = Math.sin(index * 1.73) * profile.pitchRange * 0.18;
  const pitch = Math.max(60, profile.basePitch + pitchVariation + phraseWave);
  const durationVariation = 0.86 + ((seed >>> 8) % 30) / 100;
  const duration = profile.duration * durationVariation * (0.92 + intensity * 0.12);
  const emphasis = unit.emphasis * (0.9 + intensity * 0.22);
  const formant = clamp(
    formantForVowel(unit.vowel) + profile.formantShift + (((seed >>> 16) % 80) - 40),
    260,
    1550,
  );

  const alternatingGlide = index % 3 === 2
    ? 2 - profile.glide
    : profile.glide;

  vocalTone(context, output, {
    start,
    duration,
    from: pitch,
    to: Math.max(55, pitch * alternatingGlide),
    gain: profile.gain * emphasis,
    formant,
    q: sound === 'grumble' ? 0.85 : 1.35,
    type: profile.type,
    vibrato: profile.vibrato,
  });

  vocalTone(context, output, {
    start: start + 0.004,
    duration: duration * 0.9,
    from: pitch * 2.01,
    to: Math.max(90, pitch * 2.01 * alternatingGlide),
    gain: profile.gain * 0.19 * emphasis,
    formant: clamp(formant * 1.28, 360, 1900),
    q: 1.05,
    type: 'sine',
    vibrato: profile.vibrato * 0.55,
  });

  if (profile.breath > 0) {
    noiseBurst(
      context,
      output,
      start,
      duration * 0.82,
      profile.breath * emphasis,
      Math.max(620, formant * 1.5),
      Math.max(260, formant * 0.72),
    );
  }

  return duration;
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

export async function playBotUtterance(
  text: string,
  sound: BotSound,
  intensity = 0.5,
): Promise<number> {
  const context = getContext();
  if (context.state === 'suspended') await context.resume();

  stopBotSounds();

  const units = tokenizeVocalUnits(text);
  if (!units.length) return playBotSound(sound, intensity);

  const output = createOutput(context, intensity);
  const start = context.currentTime + 0.02;
  let cursor = start;

  units.forEach((unit, index) => {
    const duration = scheduleVocalUnit(
      context,
      output,
      unit,
      sound,
      cursor,
      index,
      clamp(intensity, 0, 1),
    );

    cursor += duration + unit.pauseAfter;
  });

  return Math.round((cursor - start) * 1000);
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
