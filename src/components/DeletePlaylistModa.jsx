'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { X, AlertTriangle } from 'lucide-react';

export function DeletePlaylistModal({ onClose, playlist, onDeleteSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deletePlaylist = async () => {
    try {
      setLoading(true);

      // 1. Get all songs associated with this playlist
      const { data: playlistSongs, error: songsError } = await supabase
        .from('songs')
        .select('id, song_img')
        .eq('playlist_id', playlist.id);

      if (songsError) throw songsError;
      console.log('Found songs to process:', playlistSongs);

      // 2. Store all the songs (they're already stored in playlistSongs variable)

      // 3 & 4. Delete all song images from storage bucket
      if (playlistSongs && playlistSongs.length > 0) {
        // Get the user ID from the session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) throw new Error('User not authenticated');

        for (const song of playlistSongs) {
          if (song.song_img) {
            console.log('Processing song image URL:', song.song_img);

            // The path should be /{userId}/{playlistId}/{songId}.{ext}
            const filePath = `${userId}/${playlist.id}/${song.id}`;
            console.log('File path to delete:', filePath);

            try {
              // List files that match this prefix
              const { data: files, error: listError } = await supabase.storage
                .from('song-covers')
                .list(userId + '/' + playlist.id, {
                  search: song.id,
                });

              if (listError) throw listError;

              // Delete any matching files (should be just one per song)
              if (files && files.length > 0) {
                const filesToDelete = files.map(
                  (file) => `${userId}/${playlist.id}/${file.name}`
                );

                const { error: deleteError } = await supabase.storage
                  .from('song-covers')
                  .remove(filesToDelete);

                if (deleteError)
                  console.error('Error deleting image:', deleteError);
                else
                  console.log(
                    'Successfully deleted song images:',
                    filesToDelete
                  );
              }
            } catch (err) {
              console.error(`Error handling file for song ${song.id}:`, err);
            }
          }
        }
      }

      // Delete the playlist image if it exists
      if (playlist.playlist_img) {
        await supabase.storage
          .from('playlist-images')
          .remove([playlist.playlist_img]);
      }

      // Delete all songs in this playlist
      const { error: deleteSongsError } = await supabase
        .from('songs')
        .delete()
        .eq('playlist_id', playlist.id);

      if (deleteSongsError) throw deleteSongsError;

      // Delete the playlist itself
      const { error: deleteError } = await supabase
        .from('Playlists')
        .delete()
        .eq('id', playlist.id);

      if (deleteError) throw deleteError;

      // Call success callback
      onDeleteSuccess && onDeleteSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setError('Failed to delete playlist. Please try again.');
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
      <div className="z-[100] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zinc-900 rounded-lg shadow-xl w-[280px]">
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              Delete Playlist
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-red-900/30 p-3 rounded-full">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
            </div>

            <p className="text-zinc-300 text-center">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">
                "{playlist?.name}"
              </span>
              ? This action cannot be undone.
            </p>

            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 flex-1 text-sm text-zinc-300 hover:text-white transition-colors bg-zinc-800 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={deletePlaylist}
              className={`px-4 py-2 flex-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
