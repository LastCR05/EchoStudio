import * as Tone from 'tone';
import { Mp3Encoder } from 'lamejs';

// Helper function to convert an AudioBuffer to MP3 using lamejs
function audioBufferToMP3(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const mp3encoder = new Mp3Encoder(numChannels, sampleRate, 192); // 192kbps bitrate
  const mp3Data = [];

  // Get audio data from each channel
  const channelData = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  // Process audio in chunks (1152 samples, a multiple of 576 for MP3)
  const chunkSize = 1152;
  const length = audioBuffer.length;

  for (let i = 0; i < length; i += chunkSize) {
    const leftChunk = new Int16Array(Math.min(chunkSize, length - i));
    let rightChunk = null;
    if (numChannels > 1) {
      rightChunk = new Int16Array(Math.min(chunkSize, length - i));
    }

    // Convert each sample from float32 to 16-bit integer
    for (let j = 0; j < Math.min(chunkSize, length - i); j++) {
      leftChunk[j] = Math.max(
        -32768,
        Math.min(32767, channelData[0][i + j] * 32767)
      );
      if (numChannels > 1) {
        rightChunk[j] = Math.max(
          -32768,
          Math.min(32767, channelData[1][i + j] * 32767)
        );
      }
    }

    // Encode the chunk
    let mp3buf;
    if (numChannels > 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    }
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  // Flush the encoder to get any remaining MP3 data
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  return mp3Data;
}

// Main function to render and download processed audio as an MP3 file
export async function downloadProcessedAudioMP3({
  playerBuffer,
  volume,
  nightcore,
  reverbDecay,
  bassBoost,
  originalFileName,
  backgroundEffects = {},
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

      // Background Effects Processing
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

      // Start the main audio player at time 0
      mainPlayer.start(0);
    }, renderDuration);

    console.log('Offline rendering complete:', renderedBuffer);

    // Convert the rendered AudioBuffer to MP3 data
    const mp3Data = audioBufferToMP3(renderedBuffer);

    // Create a Blob from the MP3 data and trigger the download
    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);

    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    const downloadName = `${baseName}-EchoStudio.mp3`;

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('MP3 Download initiated');
  } catch (error) {
    console.error('Error in downloadProcessedAudioMP3:', error);
  }
}
