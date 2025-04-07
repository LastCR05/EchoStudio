// app/api/youtube-info/route.js
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

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

    // Extract metadata using yt-dlp
    const metadata = await extractYoutubeMetadata(url);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function extractYoutubeMetadata(url) {
  return new Promise((resolve, reject) => {
    // Use yt-dlp to extract just the metadata we need
    // --print format extracts just the specified fields and outputs them as JSON
    const ytDlpProcess = spawn('yt-dlp.exe', [
      '--print',
      '{"title":%(title)j,"uploader":%(uploader)j,"thumbnail":%(thumbnail)j,"duration":%(duration)j}',
      '--no-playlist',
      '--no-check-certificate',
      '--quiet',
      url,
    ]);

    let outputData = '';
    let errorMessage = '';

    // Collect output data
    ytDlpProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Collect error messages
    ytDlpProcess.stderr.on('data', (data) => {
      errorMessage += data.toString();
    });

    // Handle process completion
    ytDlpProcess.on('close', (code) => {
      if (code === 0 && outputData) {
        try {
          // Parse the JSON output from yt-dlp
          const metadata = JSON.parse(outputData.trim());

          // Format the response for our application
          resolve({
            song_title: metadata.title || 'Unknown Title',
            artist: metadata.uploader || 'Unknown Artist',
            thumbnail_url: metadata.thumbnail || null,
            duration: metadata.duration ? Math.floor(metadata.duration) : 0,
            success: true,
          });
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${error.message}`));
        }
      } else {
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
}
