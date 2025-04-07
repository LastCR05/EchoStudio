// api/download/route.js
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * Ensures that the temporary directory exists.
 * @param {string} tempDir - The path to the temp directory.
 * @returns {Promise<void>}
 */
async function ensureTempDir(tempDir) {
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }
}

/**
 * Generates the yt-dlp download command based on the provided parameters.
 *
 * @param {string} ytdlpPath - The full path to the yt-dlp executable.
 * @param {string} url - The video URL.
 * @param {string} lowerFormat - The desired file format (in lower case).
 * @param {string} quality - The requested quality (e.g., "720p" or "128 kbps").
 * @param {string} outputPath - The file path where the output will be saved.
 * @returns {string} - The complete command to execute.
 */
function generateDownloadCommand(
  ytdlpPath,
  url,
  lowerFormat,
  quality,
  outputPath
) {
  let formatString;
  let extraArgs = '';

  if (lowerFormat === 'mp3') {
    // For mp3, extract audio and convert to mp3 format.
    const bitrate = quality.replace('kbps', '');
    formatString = `bestaudio[abr<=${bitrate}]`;
    extraArgs = '--extract-audio --audio-format mp3';
  } else if (quality.includes('p')) {
    // Video download: use the requested resolution and best available audio.
    const height = quality.replace('p', '');
    formatString = `bestvideo[height<=${height}][ext=${lowerFormat}]+bestaudio[ext=m4a]`;
  } else {
    // Other audio formats (e.g., aac) without conversion.
    const bitrate = quality.replace('kbps', '');
    formatString = `bestaudio[abr<=${bitrate}][ext=${lowerFormat}]`;
  }

  return `"${ytdlpPath}" "${url}" -f "${formatString}" ${extraArgs} -o "${outputPath}"`;
}

export async function POST(req) {
  try {
    const { url, format, quality } = await req.json();

    if (!url || !format || !quality) {
      return NextResponse.json(
        { message: 'URL, format and quality are required' },
        { status: 400 }
      );
    }

    const tempDir = path.join(process.cwd(), 'temp');
    await ensureTempDir(tempDir);

    // Ensure the file extension is lower case.
    const lowerFormat = format.toLowerCase();
    const fileName = `${uuidv4()}.${lowerFormat}`;
    const outputPath = path.join(tempDir, fileName);

    const ytdlpPath = path.join(process.cwd(), 'yt-dlp.exe');
    const command = generateDownloadCommand(
      ytdlpPath,
      url,
      lowerFormat,
      quality,
      outputPath
    );

    console.log('Executing command:', command);

    const { stdout, stderr } = await execAsync(command);

    // Verify that the file was created.
    try {
      await fs.access(outputPath);
    } catch {
      throw new Error('Download failed: File not created');
    }

    // Read the downloaded file.
    const fileBuffer = await fs.readFile(outputPath);

    // Delete the temporary file.
    await fs.unlink(outputPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': lowerFormat === 'mp4' ? 'video/mp4' : 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    console.error('Error details:', error.stdout, error.stderr);

    let errorMessage = 'Failed to download file';
    if (error.stderr?.includes('Requested format is not available')) {
      errorMessage =
        'This quality is not available for this video. Please try a different quality.';
    }

    return NextResponse.json(
      {
        message: errorMessage,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
