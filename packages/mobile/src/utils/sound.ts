import { Audio } from "expo-av";

let timerSound: Audio.Sound | null = null;

/**
 * Play a short beep sound when the rest timer completes.
 * Uses the system default notification-style sound via expo-av.
 * Falls back silently if audio cannot be loaded.
 */
export async function playTimerCompleteSound(): Promise<void> {
  try {
    // Set audio mode so sound plays even in silent mode on iOS
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    // Unload previous sound if it exists
    if (timerSound) {
      await timerSound.unloadAsync();
      timerSound = null;
    }

    // Generate a simple beep using a short sine wave via expo-av
    // We use a bundled asset approach - create a tiny beep programmatically
    // Since we don't have a bundled sound file, use a notification-style approach
    const { sound } = await Audio.Sound.createAsync(
      // Use a data URI for a minimal WAV beep (440Hz, 200ms)
      { uri: generateBeepDataUri() },
      { shouldPlay: true, volume: 0.8 }
    );
    timerSound = sound;

    // Auto-unload after playback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        timerSound = null;
      }
    });
  } catch {
    // Sound is optional - fail silently
  }
}

/**
 * Generate a minimal WAV file as a data URI containing a short beep tone.
 * This avoids needing to bundle a separate audio asset file.
 */
function generateBeepDataUri(): string {
  const sampleRate = 22050;
  const duration = 0.15; // 150ms
  const frequency = 880; // A5 note
  const numSamples = Math.floor(sampleRate * duration);

  // WAV header + PCM 16-bit mono data
  const dataSize = numSamples * 2;
  const fileSize = 44 + dataSize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Generate sine wave samples with fade-out envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = 1 - i / numSamples; // Linear fade-out
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.5;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  // Convert to base64 data URI
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Clean up any loaded sound resources.
 * Call this when the app is backgrounded or workout ends.
 */
export async function unloadTimerSound(): Promise<void> {
  if (timerSound) {
    try {
      await timerSound.unloadAsync();
    } catch {
      // Ignore cleanup errors
    }
    timerSound = null;
  }
}
