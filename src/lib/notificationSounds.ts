// PickMe notification sounds
// Uses Web Audio API for reliable playback

type NotificationType = 'newRequest' | 'accepted' | 'message' | 'offerReceived';

const frequencies: Record<NotificationType, number[]> = {
  newRequest: [440, 554, 659, 880, 1047, 880, 1047],
  accepted: [523, 659, 784, 1047, 784, 1047],
  message: [784, 988, 784, 988],
  offerReceived: [659, 784, 988, 1175],
};

const durations: Record<NotificationType, number> = {
  newRequest: 180,
  accepted: 200,
  message: 120,
  offerReceived: 150,
};

const volumes: Record<NotificationType, number> = {
  newRequest: 0.6,
  accepted: 0.5,
  message: 0.4,
  offerReceived: 0.55,
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(
  frequency: number, 
  duration: number, 
  startTime: number, 
  volume: number,
  waveType: OscillatorType = 'sine'
): void {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = waveType;
  
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gainNode.gain.setValueAtTime(volume, startTime + (duration / 1000) - 0.03);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration / 1000);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration / 1000 + 0.01);
}

export function playNotificationSound(type: NotificationType): void {
  try {
    const ctx = getAudioContext();
    const freqs = frequencies[type];
    const duration = durations[type];
    const volume = volumes[type];
    
    const currentTime = ctx.currentTime;
    const noteGap = duration / 1000 + 0.02;
    
    freqs.forEach((freq, i) => {
      const waveType: OscillatorType = type === 'newRequest' ? 'square' : 'sine';
      playTone(freq, duration, currentTime + i * noteGap, volume, type === 'message' ? 'sine' : waveType);
    });
    
    if (type === 'newRequest') {
      freqs.forEach((freq, i) => {
        playTone(freq * 2, duration * 0.5, currentTime + i * noteGap + 0.02, volume * 0.3, 'sine');
      });
    }
  } catch (e) {
    console.warn('Audio playback not available:', e);
  }
}

export function playUrgentAlert(): void {
  try {
    const ctx = getAudioContext();
    const volume = 0.7;
    const duration = 200;
    
    const pattern = [880, 1047, 880, 1047, 880, 1047, 880, 1047, 1318];
    const currentTime = ctx.currentTime;
    
    pattern.forEach((freq, i) => {
      playTone(freq, duration, currentTime + i * 0.22, volume, 'square');
      playTone(freq / 2, duration, currentTime + i * 0.22, volume * 0.4, 'sine');
    });
  } catch (e) {
    console.warn('Audio playback not available:', e);
  }
}

export function playNewRequestSound(): void { playNotificationSound('newRequest'); }
export function playAcceptedSound(): void { playNotificationSound('accepted'); }
export function playMessageSound(): void { playNotificationSound('message'); }

// ── Ringtone system for calls ──

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

/** Outgoing ringtone — classic "ring-ring" pattern heard by caller */
function playOutgoingRingOnce(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    // Double-ring pattern (440Hz + 480Hz, like a phone)
    [0, 0.4].forEach((offset) => {
      playTone(440, 250, t + offset, 0.35, 'sine');
      playTone(480, 250, t + offset, 0.35, 'sine');
    });
  } catch (e) {
    console.warn('Ringtone playback failed:', e);
  }
}

/** Incoming ringtone — attention-grabbing melody heard by callee */
function playIncomingRingOnce(): void {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const melody = [784, 988, 784, 1175, 988, 784];
    melody.forEach((freq, i) => {
      playTone(freq, 140, t + i * 0.16, 0.5, 'sine');
    });
  } catch (e) {
    console.warn('Ringtone playback failed:', e);
  }
}

/** Start looping ringtone. type: 'outgoing' for caller, 'incoming' for callee */
export function startRingtone(type: 'outgoing' | 'incoming'): void {
  stopRingtone(); // clear any existing
  const ringFn = type === 'outgoing' ? playOutgoingRingOnce : playIncomingRingOnce;
  ringFn(); // play immediately
  // Repeat every 2.5s for outgoing (ring-pause), 1.8s for incoming (more urgent)
  const interval = type === 'outgoing' ? 2500 : 1800;
  ringtoneInterval = setInterval(ringFn, interval);
}

/** Stop any looping ringtone */
export function stopRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

export function playArrivedSound(): void {
  try {
    const ctx = getAudioContext();
    const currentTime = ctx.currentTime;
    const notes = [659, 784, 988, 1175, 988, 1175];
    notes.forEach((freq, i) => {
      playTone(freq, 250, currentTime + i * 0.28, 0.55, 'sine');
    });
  } catch (e) {
    console.warn('Audio playback not available:', e);
  }
}

export function playCompletedSound(): void {
  try {
    const ctx = getAudioContext();
    const currentTime = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone(freq, 300, currentTime + i * 0.3, 0.5, 'sine');
    });
  } catch (e) {
    console.warn('Audio playback not available:', e);
  }
}
