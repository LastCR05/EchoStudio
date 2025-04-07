'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import { X, Upload, RefreshCw, Loader2 } from 'lucide-react';

export default function EditSongModal({
  onClose,
  onSuccess,
  song,
  playlistId,
}) {
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

  // Initialize form with song data when the component mounts
  useEffect(() => {
    if (song) {
      setSongTitle(song.song_title || '');
      setSongSource(song.song_source || '');
      setArtist(song.artist || '');
      setSelectedOption(song.song_type || 'youtube');
      setSongDuration(song.song_duration || 0);

      // Set preview image if song has an image
      if (song.song_img) {
        setPreviewUrl(song.song_img);
      }
    }
  }, [song]);

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

  // Fetch YouTube metadata (same function from AddSongModal)
  const fetchYoutubeMetadata = async (url) => {
    if (!url) {
      setError('Please enter a YouTube URL first');
      return;
    }

    // Skip if not a YouTube URL
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      setError('Please enter a valid YouTube URL');
      return;
    }

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

      // Overwrite fields with fetched data
      setSongTitle(data.song_title || '');
      setArtist(data.artist || '');
      setSongDuration(data.duration || 0);

      // Update thumbnail if available
      if (data.thumbnail_url) {
        setPreviewUrl(data.thumbnail_url);
        setImage(null); // Clear any uploaded file since we're using the YouTube thumbnail
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

  // Handle song update
  const updateSong = async (e) => {
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

      // Update song details in the database
      const { data: updatedSong, error: updateError } = await supabase
        .from('songs')
        .update({
          song_title: songTitle,
          song_source: songSource,
          song_type: selectedOption,
          artist: artist,
          song_duration: songDuration, // Add song duration to update
        })
        .eq('id', song.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // If there's a new image, upload it and update the song record
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

        // Upload the new image
        const { error: uploadError } = await supabase.storage
          .from('song-covers')
          .upload(filePath, image, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData, error: publicUrlError } = supabase.storage
          .from('song-covers')
          .getPublicUrl(filePath);
        if (publicUrlError) throw publicUrlError;

        const song_img = publicUrlData.publicUrl;

        // Update the song with the new image URL
        const { error: imageUpdateError } = await supabase
          .from('songs')
          .update({ song_img })
          .eq('id', song.id);

        if (imageUpdateError) throw imageUpdateError;

        updatedSong.song_img = song_img;
      } else if (
        previewUrl !== '/kawaii-upload.svg' &&
        previewUrl !== song.song_img
      ) {
        // If using a YouTube thumbnail directly
        const { error: imageUpdateError } = await supabase
          .from('songs')
          .update({ song_img: previewUrl })
          .eq('id', song.id);

        if (imageUpdateError) throw imageUpdateError;

        updatedSong.song_img = previewUrl;
      }

      // Success!
      onSuccess && onSuccess(updatedSong);
      onClose();
    } catch (err) {
      console.error('Error updating song:', err);
      setError('Failed to update song. Please try again.');
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
          <h2 className="text-xl font-semibold text-white">Edit Song</h2>
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
          <form onSubmit={updateSong}>
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
                Click to upload new thumbnail (optional)
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

            {/* YouTube Link with Fetch Button */}
            {selectedOption === 'youtube' && (
              <div className="mb-4">
                <label
                  htmlFor="youtubeLink"
                  className="block text-sm text-zinc-400 mb-1"
                >
                  YouTube Link
                </label>
                <div className="flex space-x-2">
                  <input
                    id="youtubeLink"
                    type="text"
                    value={songSource}
                    onPaste={(e) => e.stopPropagation()}
                    onChange={(e) => setSongSource(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-[#2b44dd] focus:outline-none transition-colors"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <button
                    type="button"
                    onClick={() => fetchYoutubeMetadata(songSource)}
                    disabled={fetchingMetadata}
                    className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded text-white transition-colors flex items-center justify-center"
                  >
                    {fetchingMetadata ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                  </button>
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
              {loading ? 'Updating Song...' : 'Update Song'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
