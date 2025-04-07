import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { Readable } from 'stream';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Create a promise to handle the streaming process
    const streamPromise = new Promise((resolve, reject) => {
      // Use lower CPU options:
      // --extract-audio: Extract audio only
      // --audio-format mp3: Convert to mp3 (less CPU intensive than some other formats)
      // --audio-quality 128K: Reasonable quality without excessive CPU use
      // -o -: Output to stdout
      // --no-playlist: Don't process playlists
      // --no-check-certificate: Skip HTTPS certificate validation
      // --no-part: Don't create temporary .part files
      const ytDlpProcess = spawn('yt-dlp.exe', [
        '--extract-audio',
        '--audio-format',
        'mp3',
        '--audio-quality',
        '128K',
        '-o',
        '-',
        '--no-playlist',
        '--no-check-certificate',
        '--no-part',
        '--quiet', // Reduce console output
        url,
      ]);

      // Initialize variables for data collection
      const chunks = [];
      let errorMessage = '';

      // Handle stdout data (the audio stream)
      ytDlpProcess.stdout.on('data', (data) => {
        chunks.push(data);
      });

      // Handle stderr for error messages
      ytDlpProcess.stderr.on('data', (data) => {
        errorMessage += data.toString();
      });

      // Handle process completion
      ytDlpProcess.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          // Success - resolve with the collected data
          resolve(Buffer.concat(chunks));
        } else {
          // Error - reject with the error message or a generic one
          reject(
            new Error(errorMessage || `yt-dlp process exited with code ${code}`)
          );
        }
      });

      // Handle any process errors
      ytDlpProcess.on('error', (err) => {
        reject(new Error(`Failed to start yt-dlp process: ${err.message}`));
      });
    });

    try {
      // Await the streaming process
      const audioBuffer = await streamPromise;

      // Return the audio data directly
      const response = new NextResponse(audioBuffer);
      response.headers.set('Content-Type', 'audio/mpeg');
      return response;
    } catch (error) {
      console.error('yt-dlp error:', error);

      // Return error to client
      return NextResponse.json(
        { error: error.message || 'Failed to extract audio from YouTube' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
