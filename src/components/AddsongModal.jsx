'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import { X, Upload, Loader2 } from 'lucide-react';

export default function AddSongModal({ onClose, onSuccess, playlistId }) {
  const [songTitle, setSongTitle] = useState('');
  const [songSource, setSongSource] = useState('');
  const [image, setImage] = useState(null);
  const [artist, setArtist] = useState('');
  const [previewUrl, setPreviewUrl] = useState('/kawaii-upload.svg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOption, setSelectedOption] = useState('youtube');
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [songDuration, setSongDuration] = useState(0);
  const fileInputRef = useRef(null);
  const lastProcessedUrl = useRef('');

  // Handle image click to open file dialog
  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File size validation (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image file is too large. Maximum size is 2MB.');
      return;
    }

    // Preview the image
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setImage(file);
  };

  // Fetch YouTube metadata when URL changes
  const fetchYoutubeMetadata = async (url) => {
    // Don't refetch for the same URL
    if (url === lastProcessedUrl.current || !url) return;

    // Skip if not a YouTube URL
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) return;

    try {
      setFetchingMetadata(true);
      setError('');
      lastProcessedUrl.current = url;

      const response = await fetch('/api/youtube-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch video info');
      }

      const data = await response.json();

      // Only populate empty fields
      if (!songTitle) setSongTitle(data.song_title || '');
      if (!artist) setArtist(data.artist || '');
      setSongDuration(data.duration || 0);

      // Only set thumbnail if user hasn't uploaded one
      if (data.thumbnail_url && previewUrl === '/kawaii-upload.svg') {
        setPreviewUrl(data.thumbnail_url);
        // We're using the YouTube thumbnail URL directly, not downloading it
      }
    } catch (err) {
      console.error('Error fetching YouTube metadata:', err);
      setError(
        'Could not fetch video information. Please fill in details manually.'
      );
    } finally {
      setFetchingMetadata(false);
    }
  };

  // Handle songSource input changes and trigger metadata fetch
  const handleSongSourceChange = (e) => {
    const newUrl = e.target.value;
    setSongSource(newUrl);

    // Debounce metadata fetching to avoid unnecessary requests
    if (selectedOption === 'youtube' && newUrl.trim()) {
      // Use a timer to delay the API call slightly
      const timer = setTimeout(() => {
        fetchYoutubeMetadata(newUrl);
      }, 500);

      return () => clearTimeout(timer);
    }
  };

  // Handle song creation
  const createSong = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!songTitle.trim()) {
      setError('Please enter a song title');
      return;
    }

    if (selectedOption === 'youtube' && !songSource.trim()) {
      setError('Please enter a YouTube link');
      return;
    }

    // YouTube link validation (basic check)
    if (
      selectedOption === 'youtube' &&
      !songSource.includes('youtube.com/') &&
      !songSource.includes('youtu.be/')
    ) {
      setError('Please enter a valid YouTube link');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // First, query the count of songs for the given playlistId
      const { count, error: countError } = await supabase
        .from('songs')
        .select('id', { count: 'exact', head: true })
        .eq('playlist_id', playlistId);

      if (countError) throw countError;
      // Use the count as the next index (if there are 3 songs, the next index is 3)
      const nextIndex = count || 0;

      // Insert the new song along with the computed index
      const { data: song, error: insertError } = await supabase
        .from('songs')
        .insert({
          song_title: songTitle,
          song_source: songSource,
          playlist_id: playlistId,
          song_type: selectedOption, // 'youtube' or 'mp3'
          index: nextIndex, // Set the next available index here
          artist: artist, // Add this line to include the artist
          song_duration: songDuration, // Add the duration
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If there's an image URL from YouTube or an uploaded file
      let songImageUrl = null;

      // If user uploaded an image file
      if (image) {
        // Get current user session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('You must be logged in to update a song image');
        }

        const fileExt = image.name.split('.').pop();
        const filePath = `/${session.user.id}/${playlistId}/${song.id}.${fileExt}`;

        // Upload the image to storage
        const { error: uploadError } = await supabase.storage
          .from('song-covers')
          .upload(filePath, image, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData, error: publicUrlError } = supabase.storage
          .from('song-covers')
          .getPublicUrl(filePath);
        if (publicUrlError) throw publicUrlError;

        songImageUrl = publicUrlData.publicUrl;
      }
      // If we're using a YouTube thumbnail URL directly
      else if (previewUrl !== '/kawaii-upload.svg') {
        songImageUrl = previewUrl;
      }

      // Update the song with the image URL if we have one
      if (songImageUrl) {
        const { error: updateError } = await supabase
          .from('songs')
          .update({ song_img: songImageUrl })
          .eq('id', song.id);

        if (updateError) throw updateError;

        song.song_img = songImageUrl;
      }

      // Success!
      onSuccess && onSuccess(song);
      onClose();
    } catch (err) {
      console.error('Error creating song:', err);
      setError('Failed to add song. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[80] bg-zinc-900 rounded-lg shadow-xl w-[380px] max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">Add a Song</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Option Selection */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedOption === 'youtube'
                  ? 'border-[#2b44dd] bg-[#2b44dd]/10'
                  : 'border-zinc-700 hover:border-zinc-500'
              }`}
              onClick={() => setSelectedOption('youtube')}
            >
              <h3 className="text-white font-medium mb-2">YouTube Link</h3>
              <p className="text-xs text-zinc-400">
                No storage limits. Stream songs directly from YouTube.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 cursor-not-allowed opacity-60">
              <h3 className="text-white font-medium mb-2">MP3 Upload</h3>
              <p className="text-xs text-zinc-400">
                50MB limit per playlist. Coming soon.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={createSong}>
            {/* Image Upload */}
            <div className="mb-4 flex flex-col items-center">
              <div
                className="w-32 h-32 bg-zinc-800 rounded-md overflow-hidden relative cursor-pointer group"
                onClick={handleImageClick}
              >
                <Image
                  src={previewUrl}
                  alt="Song thumbnail"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload size={24} className="text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Click to upload thumbnail (optional)
              </p>
            </div>

            {/* Song Title */}
            <div className="mb-4">
              <label
                htmlFor="songTitle"
                className="block text-sm text-zinc-400 mb-1"
              >
                Song Title
              </label>
              <input
                id="songTitle"
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-[#2b44dd] focus:outline-none transition-colors"
                placeholder="Enter song title"
              />
            </div>

            {/* Artist (Optional) */}
            <div className="mb-4">
              <label
                htmlFor="artist"
                className="block text-sm text-zinc-400 mb-1"
              >
                Artist (Optional)
              </label>
              <input
                id="artist"
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-[#2b44dd] focus:outline-none transition-colors"
                placeholder="Enter artist name"
              />
            </div>

            {/* YouTube Link */}
            {selectedOption === 'youtube' && (
              <div className="mb-4">
                <label
                  htmlFor="youtubeLink"
                  className="block text-sm text-zinc-400 mb-1"
                >
                  YouTube Link
                </label>
                <div className="relative">
                  <input
                    id="youtubeLink"
                    type="text"
                    value={songSource}
                    onPaste={(e) => e.stopPropagation()} // Add this line
                    onChange={handleSongSourceChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-[#2b44dd] focus:outline-none transition-colors"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  {fetchingMetadata && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2
                        size={18}
                        className="animate-spin text-zinc-400"
                      />
                    </div>
                  )}
                </div>
                {fetchingMetadata && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Fetching video information...
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || fetchingMetadata}
              className="w-full bg-[#2b44dd] hover:bg-opacity-80 text-white py-2 rounded-md flex items-center justify-center transition-colors disabled:opacity-70"
            >
              {loading ? 'Adding Song...' : 'Add Song'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// Change the function declaration to accept playlistName
export async function updateSongImage(songId, image, playlistId) {
  try {
    // Get current user session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to update a song image');
    }

    const userId = session.user.id;
    const fileExt = image.name.split('.').pop();
    const filePath = `/${userId}/${playlistId}/${songId}.${fileExt}`;

    // Upload the image to Supabase storage with upsert
    const { error: uploadError } = await supabase.storage
      .from('song-covers')
      .upload(filePath, image, { upsert: true });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL from Supabase storage
    const { data: publicUrlData } = supabase.storage
      .from('song-covers')
      .getPublicUrl(filePath);

    // Append a cache-busting query parameter to force a fresh load
    const updatedUrl = publicUrlData.publicUrl + '?t=' + Date.now();

    // Update the song record with the new image URL
    const { error: updateError } = await supabase
      .from('songs')
      .update({ song_img: updatedUrl })
      .eq('id', songId);
    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return updatedUrl;
  } catch (err) {
    console.error('Error updating song image:', err);
    throw err;
  }
}

export function getUpdatedSongImageUrl(url, cacheBust) {
  if (!url) return '/placeholder.png';
  if (!cacheBust) return url; // return the cached URL if no update has been made
  const separator = url.includes('?') ? '&' : '?';
  return url + separator + 't=' + cacheBust;
}
