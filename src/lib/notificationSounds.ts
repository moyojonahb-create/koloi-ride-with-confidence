// Koloi notification sounds
// Uses Web Audio API for reliable playback with LOUD, distinct sounds

type NotificationType = 'newRequest' | 'accepted' | 'message';

// More distinct frequencies and longer durations for audibility
const frequencies: Record<NotificationType, number[]> = {
  // Loud urgent ascending pattern - driver alert
  newRequest: [440, 554, 659, 880, 1047, 880, 1047], // A4 -> C#5 -> E5 -> A5 -> C6 -> A5 -> C6
  // Happy confirmation - ride accepted
  accepted: [523, 659, 784, 1047, 784, 1047], // C5 -> E5 -> G5 -> C6 -> G5 -> C6
  // Simple double ping - new message
  message: [784, 988, 784, 988], // G5 -> B5 -> G5 -> B5
};

const durations: Record<NotificationType, number> = {
  newRequest: 180,  // Longer notes
  accepted: 200,
  message: 120,
};

const volumes: Record<NotificationType, number> = {
  newRequest: 0.6,  // LOUD for driver alerts
  accepted: 0.5,
  message: 0.4,
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (needed for mobile)
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
  
  // Envelope: quick attack, sustain, quick release
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02); // Fast attack
  gainNode.gain.setValueAtTime(volume, startTime + (duration / 1000) - 0.03);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration / 1000); // Release
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration / 1000 + 0.01);
}

export function playNotificationSound(type: NotificationType): void {
  try {
    const ctx = getAudioContext();
    const freqs = frequencies[type];
    const duration = durations[type];
    const volume = volumes[type];
    
    let currentTime = ctx.currentTime;
    const noteGap = duration / 1000 + 0.02; // Small gap between notes
    
    freqs.forEach((freq, i) => {
      // Use triangle wave for softer sound on messages, square for urgency
      const waveType: OscillatorType = type === 'newRequest' ? 'square' : 'sine';
      playTone(freq, duration, currentTime + i * noteGap, volume, type === 'message' ? 'sine' : waveType);
    });
    
    // For newRequest, add a second layer for more impact
    if (type === 'newRequest') {
      freqs.forEach((freq, i) => {
        playTone(freq * 2, duration * 0.5, currentTime + i * noteGap + 0.02, volume * 0.3, 'sine');
      });
    }
  } catch (e) {
    console.warn('Audio playback not available:', e);
  }
}

// Play a longer, more attention-grabbing alert for critical notifications
export function playUrgentAlert(): void {
  try {
    const ctx = getAudioContext();
    const volume = 0.7;
    const duration = 200;
    
    // Repeating urgent pattern - like an alarm
    const pattern = [880, 1047, 880, 1047, 880, 1047, 880, 1047, 1318];
    let currentTime = ctx.currentTime;
    
    pattern.forEach((freq, i) => {
      playTone(freq, duration, currentTime + i * 0.22, volume, 'square');
      playTone(freq / 2, duration, currentTime + i * 0.22, volume * 0.4, 'sine');
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
