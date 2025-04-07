import * as Tone from 'tone';

// Helper functions to convert AudioBuffer to WAV ArrayBuffer
export function audioBufferToWav(buffer, opt = {}) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = opt.float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let samples;
  if (numChannels === 2) {
    samples = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    samples = buffer.getChannelData(0);
  }
  return encodeWAV(samples, numChannels, sampleRate, bitDepth);
}

function interleave(leftChannel, rightChannel) {
  const length = leftChannel.length + rightChannel.length;
  const result = new Float32Array(length);
  let index = 0,
    inputIndex = 0;
  while (index < length) {
    result[index++] = leftChannel[inputIndex];
    result[index++] = rightChannel[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(samples, numChannels, sampleRate, bitDepth) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (bitDepth === 16) {
    floatTo16BitPCM(view, 44, samples);
  } else {
    for (let i = 0; i < samples.length; i++) {
      view.setFloat32(44 + i * 4, samples[i], true);
    }
  }
  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

// Main function to render and download processed audio as a WAV file
export async function downloadProcessedAudio({
  playerBuffer,
  volume,
  nightcore,
  reverbDecay,
  bassBoost,
  originalFileName,
  backgroundEffects = {}, // optional background effects configuration
}) {
  try {
    if (!playerBuffer) {
      console.error('No audio loaded to process.');
      return;
    }

    const mainBuffer = playerBuffer;
    const renderDuration = mainBuffer.duration / nightcore;
    console.log('Starting offline rendering with duration:', renderDuration);

    const renderedBuffer = await Tone.Offline(async () => {
      // Main Audio Processing
      const mainGain = new Tone.Gain(volume / 100);
      mainGain.toDestination();

      const mainPlayer = new Tone.Player(mainBuffer).connect(mainGain);
      mainPlayer.playbackRate = nightcore;

      const bassFilter = new Tone.Filter({
        type: 'peaking',
        frequency: 80,
        Q: 3,
        gain: bassBoost,
      });

      const reverb = new Tone.Reverb({
        decay: reverbDecay,
        wet: 1.0,
        preDelay: 0.01,
      });
      await reverb.generate();

      mainPlayer.fan(bassFilter, reverb);
      bassFilter.connect(mainGain);
      reverb.connect(mainGain);

      // Handle optional background effects if provided
      const {
        showRainControl,
        rainPlayerBuffer,
        rainVolume,
        showWindControl,
        windPlayerBuffer,
        windVolume,
        showGreenControl,
        greenPlayerBuffer,
        greenVolume,
        showFireControl,
        firePlayerBuffer,
        fireVolume,
      } = backgroundEffects;

      if (showRainControl && rainPlayerBuffer) {
        const rainGain = new Tone.Gain(rainVolume / 100);
        rainGain.toDestination();
        const rainPlayer = new Tone.Player(rainPlayerBuffer).connect(rainGain);
        rainPlayer.loop = true;
        rainPlayer.start(0);
      }
      if (showWindControl && windPlayerBuffer) {
        const windGain = new Tone.Gain(windVolume / 100);
        windGain.toDestination();
        const windPlayer = new Tone.Player(windPlayerBuffer).connect(windGain);
        windPlayer.loop = true;
        windPlayer.start(0);
      }
      if (showGreenControl && greenPlayerBuffer) {
        const greenGain = new Tone.Gain(greenVolume / 100);
        greenGain.toDestination();
        const greenPlayer = new Tone.Player(greenPlayerBuffer).connect(
          greenGain
        );
        greenPlayer.loop = true;
        greenPlayer.start(0);
      }
      if (showFireControl && firePlayerBuffer) {
        const fireGain = new Tone.Gain(fireVolume / 100);
        fireGain.toDestination();
        const firePlayer = new Tone.Player(firePlayerBuffer).connect(fireGain);
        firePlayer.loop = true;
        firePlayer.start(0);
      }

      // Start main audio
      mainPlayer.start(0);
    }, renderDuration);

    console.log('Offline rendering complete:', renderedBuffer);

    // Convert rendered AudioBuffer to WAV
    const wavArrayBuffer = audioBufferToWav(renderedBuffer);

    // Create a Blob and trigger download
    const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    const downloadName = `${baseName}-EchoStudio.wav`;

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Download initiated');
  } catch (error) {
    console.error('Error in downloadProcessedAudio:', error);
  }
}
