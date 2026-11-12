const MEOW_URL = '/sounds/meow.mp3';

let context: AudioContext | null = null;
let playing: AudioScheduledSourceNode[] = [];
let clip: HTMLAudioElement | null = null;

function audioContext(): AudioContext | null {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  context ??= new AudioCtx();
  return context;
}

export async function unlockSound(): Promise<boolean> {
  const audio = audioContext();
  if (!audio) return false;
  try {
    await audio.resume();
  } catch {
    return false;
  }
  return audio.state === 'running';
}

function stopTones() {
  for (const node of playing) {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  }
  playing = [];
  if (clip) {
    clip.pause();
    clip = null;
  }
}

function tone(freq: number, at: number, duration: number, volume: number) {
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
  playing.push(osc);
}

/** Soft timer chime. The meow itself is the bundled recording. */
export async function playChime(volume: number): Promise<'played' | 'blocked'> {
  const ready = await unlockSound();
  if (!ready || !context) return 'blocked';
  stopTones();
  const now = context.currentTime;
  const level = Math.max(0.001, Math.min(0.18, volume * 0.14));
  tone(523.25, now, 0.16, level);
  tone(659.25, now + 0.14, 0.26, level);
  return 'played';
}

export async function playMeow(volume: number): Promise<'played' | 'blocked'> {
  const ready = await unlockSound();
  if (!ready) return 'blocked';
  stopTones();
  const audio = new Audio(MEOW_URL);
  audio.volume = Math.min(1, Math.max(0, volume));
  clip = audio;
  try {
    await audio.play();
    return 'played';
  } catch {
    return 'blocked';
  }
}
