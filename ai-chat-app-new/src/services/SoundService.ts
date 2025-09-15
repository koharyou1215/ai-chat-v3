/**
 * Sound Service for AI Chat V3
 * Handles notification sounds for various app events
 */

export class SoundService {
  private static instance: SoundService;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 0.5;

  private constructor() {
    // Only initialize audio context on user interaction
    if (typeof window !== 'undefined') {
      this.initializeOnUserInteraction();
    }
  }

  static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  private initializeOnUserInteraction() {
    const initializeAudio = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.preloadSounds();
      }
      // Remove listener after initialization
      document.removeEventListener('click', initializeAudio);
      document.removeEventListener('keydown', initializeAudio);
    };

    // Add listeners for user interaction
    document.addEventListener('click', initializeAudio, { once: true });
    document.addEventListener('keydown', initializeAudio, { once: true });
  }

  private async preloadSounds() {
    // Using web audio API to generate sounds instead of loading files
    // This avoids the need for sound files

    // Task completion sound (success chime)
    this.sounds.set('taskComplete', await this.createChimeSound(800, 0.2));

    // Message received sound (soft notification)
    this.sounds.set('messageReceived', await this.createNotificationSound(600, 0.15));

    // Error sound (low tone)
    this.sounds.set('error', await this.createErrorSound(300, 0.2));

    // Click sound (soft tick)
    this.sounds.set('click', await this.createClickSound(1000, 0.05));
  }

  private createChimeSound(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) return new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 });

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Create a pleasant chime with harmonics
      data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.5 +
                Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3 +
                Math.sin(2 * Math.PI * frequency * 3 * t) * 0.2;

      // Apply envelope (fade in and out)
      const envelope = Math.min(1, t * 20) * Math.exp(-t * 5);
      data[i] *= envelope;
    }

    return buffer;
  }

  private createNotificationSound(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) return new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 });

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Two-tone notification sound
      const freq = frequency * (1 + 0.5 * Math.sin(2 * Math.PI * 2 * t));
      data[i] = Math.sin(2 * Math.PI * freq * t);

      // Smooth envelope
      const envelope = Math.sin(Math.PI * t / duration) * Math.exp(-t * 2);
      data[i] *= envelope;
    }

    return buffer;
  }

  private createErrorSound(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) return new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 });

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Low frequency error sound with slight modulation
      data[i] = Math.sin(2 * Math.PI * frequency * t) +
                Math.sin(2 * Math.PI * frequency * 0.95 * t) * 0.5;

      // Quick fade in and out
      const envelope = Math.min(1, t * 50) * Math.exp(-t * 10);
      data[i] *= envelope;
    }

    return buffer;
  }

  private createClickSound(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) return new AudioBuffer({ length: 1, sampleRate: 44100, numberOfChannels: 1 });

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Short click sound
      data[i] = (Math.random() - 0.5) * Math.exp(-t * 100);
    }

    return buffer;
  }

  private playBuffer(buffer: AudioBuffer) {
    if (!this.audioContext || !this.isEnabled) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = this.volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  // Public methods
  playTaskComplete() {
    const buffer = this.sounds.get('taskComplete');
    if (buffer) {
      this.playBuffer(buffer);
    }
  }

  playMessageReceived() {
    const buffer = this.sounds.get('messageReceived');
    if (buffer) {
      this.playBuffer(buffer);
    }
  }

  playError() {
    const buffer = this.sounds.get('error');
    if (buffer) {
      this.playBuffer(buffer);
    }
  }

  playClick() {
    const buffer = this.sounds.get('click');
    if (buffer) {
      this.playBuffer(buffer);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isReady(): boolean {
    return this.audioContext !== null && this.sounds.size > 0;
  }
}

// Export singleton instance
export const soundService = SoundService.getInstance();