// api/data/route.js
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Simplify raw codec name to a friendlier version.
 * @param {string} rawCodec
 * @returns {string}
 */
function simplifyCodecName(rawCodec) {
  if (!rawCodec || rawCodec === 'none') return '';
  const codec = rawCodec.toLowerCase();

  if (codec.startsWith('avc1')) return 'H.264 (AVC)';
  if (codec.startsWith('vp09')) return 'VP9';
  if (codec.startsWith('av01')) return 'AV1';
  if (codec.startsWith('hev1') || codec.startsWith('hvc1')) return 'HEVC';
  if (codec.startsWith('mp4a')) return 'AAC';

  return rawCodec.split('.')[0];
}

/**
 * Extracts and returns the best video formats based on resolution.
 * @param {Array} formats
 * @returns {Array}
 */
function getVideoFormats(formats) {
  const videoFormatsMap = new Map();
  formats.forEach((format) => {
    if (format.vcodec !== 'none' && format.height >= 360) {
      const key = `${format.height}p`;
      if (
        !videoFormatsMap.has(key) ||
        format.tbr > videoFormatsMap.get(key).tbr
      ) {
        videoFormatsMap.set(key, format);
      }
    }
  });

  return Array.from(videoFormatsMap.values()).map((fmt) => ({
    quality: `${fmt.height}p`,
    format: fmt.ext.toUpperCase(),
    codec: simplifyCodecName(fmt.vcodec),
    hasVideo: true,
    formatId: fmt.format_id,
  }));
}

/**
 * Returns a list of audio formats based on desired bitrates.
 * @returns {Array}
 */
function getAudioFormats() {
  const audioBitrates = [320, 256, 192, 128, 64];
  return audioBitrates.map((bitrate) => ({
    quality: `${bitrate} kbps`,
    format: 'MP3',
    codec: 'N/A',
    hasVideo: false,
    formatId: `mp3-${bitrate}`,
  }));
}

/**
 * Combines and sorts video and audio formats, putting higher quality first.
 * @param {Array} videoFormats
 * @param {Array} audioFormats
 * @returns {Array}
 */
function combineAndSortFormats(videoFormats, audioFormats) {
  return [...videoFormats, ...audioFormats].sort((a, b) => {
    if (a.hasVideo === b.hasVideo) {
      const parseQuality = (item) =>
        item.hasVideo
          ? parseInt(item.quality.replace('p', ''), 10)
          : parseInt(item.quality.replace('kbps', ''), 10);
      return parseQuality(b) - parseQuality(a);
    }
    return a.hasVideo ? -1 : 1;
  });
}

export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ message: 'URL is required' }, { status: 400 });
    }

    const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');
    const fullInfoCmd = `"${ytdlpPath}" "${url}" -J --no-playlist`;
    const { stdout } = await execAsync(fullInfoCmd);
    const videoInfo = JSON.parse(stdout);

    const videoFormats = getVideoFormats(videoInfo.formats);
    const audioFormats = getAudioFormats();
    const allFormats = combineAndSortFormats(videoFormats, audioFormats);

    const formattedResponse = {
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      formats: allFormats,
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch video information', error: error.message },
      { status: 500 }
    );
  }
}
