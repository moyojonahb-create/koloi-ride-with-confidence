// Koloi notification sounds
// Uses Web Audio API for reliable playback

type NotificationType = 'newRequest' | 'accepted' | 'message';

const frequencies: Record<NotificationType, number[]> = {
  newRequest: [523, 659, 784, 880], // C5, E5, G5, A5 - urgent ascending
  accepted: [784, 1046, 784],       // G5, C6, G5 - happy confirmation
  message: [659, 784],              // E5, G5 - simple ping
};

const durations: Record<NotificationType, number> = {
  newRequest: 150,
  accepted: 200,
  message: 100,
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, startTime: number, volume = 0.3): void {
  const ctx = getAudioContext();
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration / 1000);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration / 1000);
}

export function playNotificationSound(type: NotificationType): void {
  try {
    const ctx = getAudioContext();
    const freqs = frequencies[type];
    const duration = durations[type];
    
    let currentTime = ctx.currentTime;
    
    freqs.forEach((freq, i) => {
      playTone(freq, duration, currentTime + i * (duration / 1000 + 0.05));
    });
  } catch (e) {
    console.warn('Audio playback not available:', e);
  }
}

// Convenience exports
export function playNewRequestSound(): void {
  playNotificationSound('newRequest');
}

export function playAcceptedSound(): void {
  playNotificationSound('accepted');
}

export function playMessageSound(): void {
  playNotificationSound('message');
}
