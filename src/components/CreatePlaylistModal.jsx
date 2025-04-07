'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import { X, Upload, Music } from 'lucide-react';

// Image URL cache
const imageCache = new Map();

export default function CreatePlaylistModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('/kawaii-upload.svg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const MAX_NAME_LENGTH = 50;
  const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > FILE_SIZE_LIMIT) {
      setError('Image must be less than 2MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are supported');
      return;
    }

    setImage(file);
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setError('');
  };

  const handleNameChange = (e) => {
    if (e.target.value.length <= MAX_NAME_LENGTH) {
      setName(e.target.value);
      setError('');
    }
  };

  const createPlaylist = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a playlist name');
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to create a playlist');
        return;
      }

      // Create the playlist record first
      const { data: playlist, error: playlistError } = await supabase
        .from('Playlists')
        .insert([
          {
            name: name.trim(),
            user_id: session.user.id,
          },
        ])
        .select()
        .single();

      if (playlistError) throw playlistError;

      // If we have an image, upload it to storage
      let playlist_img = null;

      if (image) {
        const fileExt = image.name.split('.').pop();
        // Use user ID folder and playlist ID as filename
        const filePath = `${session.user.id}/${playlist.id}.${fileExt}`;

        // Upload the image
        const { error: storageError } = await supabase.storage
          .from('playlist-images')
          .upload(filePath, image, { upsert: true });

        if (storageError) throw storageError;

        // Store the file path in the database
        const { error: updateError } = await supabase
          .from('Playlists')
          .update({ playlist_img: filePath })
          .eq('id', playlist.id);

        if (updateError) throw updateError;
      }

      // Success!
      onSuccess && onSuccess({ ...playlist, playlist_img });
      onClose();
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError('Failed to create playlist. Please try again.');
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
      <div className=" z-[100] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2  bg-zinc-900 rounded-lg shadow-xl w-[280px]">
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              Create Playlist
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={createPlaylist}>
            {/* Image Upload */}
            <div className="mb-4 flex flex-col items-center">
              <div
                className="w-32 h-32 bg-zinc-800 rounded-md overflow-hidden relative cursor-pointer group"
                onClick={handleImageClick}
              >
                <Image
                  src={previewUrl}
                  alt="Playlist cover"
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
                Click to upload cover (optional)
              </p>
            </div>

            {/* Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Playlist Name*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Music size={16} className="text-zinc-500" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  className="bg-zinc-800 text-white rounded-md w-full pl-10 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#2b44dd]"
                  placeholder="My Awesome Playlist"
                  maxLength={MAX_NAME_LENGTH}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-500">{error}</span>
                <span
                  className={`text-zinc-500 ${name.length >= MAX_NAME_LENGTH * 0.8 ? 'text-amber-500' : ''}`}
                >
                  {name.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm bg-[#2b44dd] hover:bg-opacity-80 text-white rounded-md transition-colors ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export async function updatePlaylistImage(playlistId, image) {
  try {
    // Get current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to update a playlist image');
    }

    const fileExt = image.name.split('.').pop();
    // Store directly in user's folder with playlist ID as filename
    const filePath = `${session.user.id}/${playlistId}.${fileExt}`;

    // Upload with upsert to overwrite existing file
    const { error: storageError } = await supabase.storage
      .from('playlist-images')
      .upload(filePath, image, { upsert: true });

    if (storageError) throw storageError;

    // Store the file path in the database
    const { error: updateError } = await supabase
      .from('Playlists')
      .update({ playlist_img: filePath })
      .eq('id', playlistId);

    if (updateError) throw updateError;

    return filePath;
  } catch (err) {
    console.error('Error updating playlist image:', err);
    throw err;
  }
}

export function getPlaylistImageUrl(filePath) {
  if (!filePath) return '/placeholder.png'; // Fallback image

  // Check if we have a cached URL for this path
  if (imageCache.has(filePath)) {
    return imageCache.get(filePath);
  }

  const { data } = supabase.storage
    .from('playlist-images')
    .getPublicUrl(filePath);

  // Only add timestamp when the URL is first generated or explicitly refreshed
  const url = data.publicUrl;
  imageCache.set(filePath, url);
  return url;
}

// Add a function to refresh specific images in cache
export function refreshImageUrl(filePath) {
  if (!filePath) return;
  const { data } = supabase.storage
    .from('playlist-images')
    .getPublicUrl(filePath);

  const url = data.publicUrl + '?t=' + new Date().getTime();
  imageCache.set(filePath, url);
  return url;
}
