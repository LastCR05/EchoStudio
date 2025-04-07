'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import { Spinner } from './Spinner';
import {
  Play,
  X,
  Github,
  ListMusic,
  ListPlus,
  LogOut,
  Share,
  ChevronLeft,
  Trash2,
  PlusCircle,
  Pencil,
  MoreHorizontal,
} from 'lucide-react';
import CreatePlaylistModal from '../CreatePlaylistModal';
import AddSongModal from '../AddsongModal';
import { DeletePlaylistModal } from '../DeletePlaylistModa';
import EditSongModal from '../EditSongModal';
import EqualizerBars from './Equalizer';

//for updating imgs
import { updateSongImage } from '../AddsongModal';
import { updatePlaylistImage } from '../CreatePlaylistModal';
import { getPlaylistImageUrl } from '../CreatePlaylistModal';
import { getUpdatedSongImageUrl } from '../AddsongModal';
import { refreshImageUrl } from '../CreatePlaylistModal';

export default function AuthSidebar({
  show,
  onClose,
  onYoutubeSongSelect,
  currentSongIndex,
  currentSongId,
  isPlaying,
  isProcessing,
}) {
  const [session, setSession] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddSongModal, setShowAddSongModal] = useState(false); // Add this state

  // For showing selected playlist details
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  //update  imgs
  const fileInputRefs = useRef({});
  const playlistFileInputRefs = useRef({});
  const [updatingSongId, setUpdatingSongId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingSong, setEditingSong] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Modify your pencil icon click handler to open the edit modal
  const handleEditClick = (e, song) => {
    e.stopPropagation(); // Prevent triggering the song click
    setEditingSong(song);
    setShowEditModal(true);
  };

  // Add this function to handle successful song updates
  const handleSongUpdate = (updatedSong) => {
    // Update the song in your playlistSongs state
    const updatedSongs = playlistSongs.map((song) =>
      song.id === updatedSong.id
        ? { ...updatedSong, _cacheBust: Date.now() }
        : song
    );
    setPlaylistSongs(updatedSongs);

    // Only update currentSong if it exists and is defined in this scope
    try {
      if (
        typeof currentSong !== 'undefined' &&
        currentSong &&
        currentSong.id === updatedSong.id
      ) {
        setCurrentSong({ ...updatedSong, _cacheBust: Date.now() });
      }
    } catch (e) {
      // If currentSong is not defined in this scope, just ignore this part
      console.log('Note: currentSong not available in this scope');
    }
  };

  const handleFileChange = async (e, songId) => {
    const file = e.target.files[0];
    if (file) {
      setUpdatingSongId(songId);

      try {
        // 1. Create a local object URL from the file to display immediately
        const localImageUrl = URL.createObjectURL(file);

        // 2. Upload the image to Supabase in the background
        // Need to get the playlist ID for the song
        const songToUpdate = playlistSongs.find((song) => song.id === songId);
        const playlistId = songToUpdate.playlist_id;
        const newSongImg = await updateSongImage(songId, file, playlistId);

        // 3. Get the Supabase URL (we'll store this in the database/state)
        const { data: publicUrlData } = supabase.storage
          .from('playlist-images')
          .getPublicUrl(newSongImg);

        const supabaseUrl = publicUrlData.publicUrl;

        // 4. Update the state immediately with the local object URL
        setPlaylistSongs((prevSongs) =>
          prevSongs.map((song) =>
            song.id === songId
              ? {
                  ...song,
                  song_img: supabaseUrl, // Store the Supabase URL for persistence
                  localImageUrl: localImageUrl, // Store local URL for immediate display
                  _cacheBust: Date.now(),
                }
              : song
          )
        );

        // 5. Stop showing the spinner
        setUpdatingSongId(null);
      } catch (err) {
        console.error('Error updating song image:', err);
        setUpdatingSongId(null);
      }
    }
  };

  const handlePlaylistImageClick = async (playlistId) => {
    let songs = [];

    // If the playlist is already selected and its songs are loaded, use them.
    if (
      selectedPlaylist &&
      selectedPlaylist.id === playlistId &&
      playlistSongs.length > 0
    ) {
      songs = playlistSongs;
    } else {
      // Otherwise, fetch the songs for this playlist from Supabase.
      try {
        setLoadingSongs(true);
        const { data, error } = await supabase
          .from('songs')
          .select('*')
          .eq('playlist_id', playlistId)
          .order('created_at', { ascending: true });
        if (error) {
          console.error('Error fetching songs for playlist:', error);
          return;
        }
        songs = data || [];
      } catch (err) {
        console.error('Error fetching songs:', err);
        return;
      } finally {
        setLoadingSongs(false);
      }
    }

    // If songs exist, start playing the first one.
    if (songs.length > 0) {
      await onYoutubeSongSelect(songs[0], songs);
    } else {
      console.warn('No songs found in this playlist.');
    }
  };

  const handleStartPlaylist = async () => {
    if (playlistSongs && playlistSongs.length > 0) {
      // Start playing the first song in the playlist.
      await handleSongClick(playlistSongs[0]);
    } else {
      console.warn('No songs available in this playlist.');
    }
  };

  const handlePlaylistFileChange = async (e, playlistId) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const newPlaylistImg = await updatePlaylistImage(playlistId, file);
        // Update the playlists state so the new image appears in the UI:
        const refreshedUrl = refreshImageUrl(newPlaylistImg);
        setPlaylists((prev) =>
          prev.map((playlist) =>
            playlist.id === playlistId
              ? { ...playlist, playlist_img: newPlaylistImg }
              : playlist
          )
        );
      } catch (err) {
        console.error('Error updating playlist image:', err);
      }
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  // Fetch playlists when session changes
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!session) {
        setPlaylists([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get playlists for the current user
        const { data, error } = await supabase
          .from('Playlists')
          .select('id, name, created_at, playlist_img')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching playlists:', error);
          return;
        }

        setPlaylists(data || []);
      } catch (error) {
        console.error('Failed to fetch playlists:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [session]);

  // Handle login with different providers
  const signIn = async (provider) => {
    let options = {};

    if (provider === 'email') {
      // For email sign-in, you'd present a separate form, etc.
      console.log('Email sign-in would open a form');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'https://58fc-78-163-112-159.ngrok-free.app', // 🔁 Replace with your actual ngrok URL
      },
    });

    if (error) console.error(`${provider} Login Error:`, error.message);
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    onClose();
  };

  // Fetch songs for a specific playlist and show detail view
  const handleSelectPlaylist = async (playlist) => {
    try {
      setLoadingSongs(true);

      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSelectedPlaylist(playlist);
      setPlaylistSongs(data || []); // Update local state for rendering
    } catch (err) {
      console.error('Error fetching songs:', err);
    } finally {
      setLoadingSongs(false);
    }
  };

  // Go back to the playlist list
  const handleBackToList = () => {
    setSelectedPlaylist(null);
    setPlaylistSongs([]);
  };

  // New function to handle successful playlist creation
  const handlePlaylistCreated = (newPlaylist) => {
    setPlaylists([newPlaylist, ...playlists]);
  };

  // New function to handle successful song addition
  const handleSongAdded = (newSong) => {
    setPlaylistSongs([...playlistSongs, newSong]);
  };

  const handleSongClick = async (song) => {
    try {
      if (song.song_type === 'youtube' && song.song_source) {
        // Delegate handling of YouTube songs via the passed onYoutubeSongSelect callback.
        await onYoutubeSongSelect(song, playlistSongs);
      } else {
        // Placeholder for non-YouTube audio handling
        console.log('Non-YouTube audio handling is not implemented yet.');
      }
      onClose(); // Close the sidebar after handling
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}.${String(secs).padStart(2, '0')}`;
  }

  // -----------------------------------
  // RENDERING
  // -----------------------------------
  return (
    <>
      {/* Backdrop to close on outside click */}
      <div
        className={`fixed inset-0 z-40 bg-black bg-opacity-30 backdrop-blur-sm transition-opacity duration-300 ${
          show ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePlaylistCreated}
        />
      )}

      {/* Add Song Modal */}
      {showAddSongModal && selectedPlaylist && (
        <AddSongModal
          onClose={() => setShowAddSongModal(false)}
          onSuccess={handleSongAdded}
          playlistId={selectedPlaylist.id}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-[350px] bg-[#101010] z-50 transition-transform duration-300 ${
          show ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button for the entire sidebar */}
        <div className="p-5">
          <button
            onClick={onClose}
            className="absolute top-[58px] right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} className={selectedPlaylist ? 'hidden' : ''} />
          </button>
        </div>

        {/* If the user is not logged in, show the Sign-in content */}
        {!session ? (
          <div className="px-5 py-8">
            <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
            <h4 className="text-sm mt-1 text-zinc-400">
              Sign in to your account
            </h4>

            <div className="mt-10">
              <div className="flex flex-col gap-3.5">
                {/* Google Button */}
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center justify-center gap-3 rounded-full bg-white hover:bg-zinc-100 text-black py-2.5 px-4 text-sm font-medium border border-zinc-300 transition-colors"
                >
                  <Image
                    src="/icons/google.svg"
                    alt="Google"
                    width={18}
                    height={18}
                  />
                  Continue with Google
                </button>

                {/* GitHub Button */}
                <button
                  onClick={() => signIn('github')}
                  className="flex items-center justify-center gap-3 rounded-full bg-black hover:bg-zinc-900 text-white py-2.5 px-4 text-sm font-medium border border-zinc-800 transition-colors"
                >
                  <Github className="w-4 h-4 text-white" />
                  Continue with GitHub
                </button>

                {/* Discord Button */}
                <button
                  onClick={() => signIn('discord')}
                  className="flex items-center justify-center gap-3 rounded-full bg-[#5865F2] hover:bg-[#4e5bef] text-white py-2.5 px-4 text-sm font-medium transition-colors"
                >
                  <Image
                    src="/icons/discord4.svg"
                    alt="Discord"
                    width={18}
                    height={18}
                  />
                  Continue with Discord
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center my-8">
              <div className="flex-grow h-px bg-zinc-800"></div>
              <span className="px-3 text-xs text-zinc-500">OR</span>
              <div className="flex-grow h-px bg-zinc-800"></div>
            </div>

            {/* Email Sign In */}
            <button
              onClick={() => signIn('email')}
              className="w-full flex items-center justify-center rounded-full bg-[#2b44dd] hover:bg-opacity-90 text-white py-2.5 px-4 text-sm font-medium transition-colors"
            >
              Continue with Email
            </button>

            {/* Terms */}
            <p className="mt-6 text-xs text-zinc-500 text-center">
              By continuing, you agree to our{' '}
              <span className="text-zinc-400 hover:text-white cursor-pointer">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-zinc-400 hover:text-white cursor-pointer">
                Privacy Policy
              </span>
              .
            </p>
          </div>
        ) : (
          /* User is logged in, show either the playlist list OR the playlist detail */
          <div className="px-5 pt-2 pb-6 h-full overflow-y-auto ">
            {/* Profile Section */}
            {!selectedPlaylist && (
              <div className="mb-6">
                <div className="flex items-center">
                  <div className="bg-[#2b44dd] w-16 h-16 flex items-center justify-center text-white text-2xl font-semibold rounded-md">
                    {session?.user?.email?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="ml-4">
                    <h2 className="text-white text-xl font-semibold">
                      {session?.user?.user_metadata?.full_name || 'User'}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                      {session?.user?.email || ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN CONTENT: 
                If no playlist selected, show list of playlists.
                If a playlist is selected, show that playlist's songs. 
            */}
            {selectedPlaylist ? (
              /* -------------------------
                 SELECTED PLAYLIST DETAILS
                 ------------------------- */
              <div className="text-white">
                {/* Header: Back arrow + name + actions */}
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={handleBackToList}
                    className="text-zinc-400 hover:text-white"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <h1 className="text-white text-lg font-medium truncate">
                    {selectedPlaylist.name}
                  </h1>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Playlist thumbnail + info */}
                <div className="flex flex-col items-center mb-6">
                  <div
                    className="w-40 h-40 bg-zinc-800 rounded-md overflow-hidden mb-3 relative group cursor-pointer"
                    onClick={() => handleStartPlaylist()}
                  >
                    <Image
                      src={getPlaylistImageUrl(selectedPlaylist.playlist_img)}
                      alt={selectedPlaylist.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover group-hover:blur-sm transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play
                        color="white"
                        size={48}
                        className="group-hover:scale-110 transition-transform"
                      />
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm">
                    {playlistSongs.length} tracks
                  </p>
                </div>

                {/* Song list */}
                {loadingSongs ? (
                  <p className="text-zinc-500 text-sm">Loading songs...</p>
                ) : playlistSongs.length > 0 ? (
                  <div className="space-y-1 custom-scrollbar">
                    {playlistSongs.map((song, index) => (
                      <div
                        key={song.id}
                        className="flex items-center p-3 border-b border-zinc-800 hover:bg-zinc-900 transition-colors cursor-pointer group"
                        onClick={async () => handleSongClick(song)}
                      >
                        {/* Song Image */}
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0 group cursor-pointer">
                          <img
                            src={
                              song.localImageUrl ||
                              getUpdatedSongImageUrl(
                                song.song_img,
                                song._cacheBust
                              )
                            }
                            alt={song.song_title}
                            className={`w-full h-full object-cover ${
                              song.id === updatingSongId ? 'blur-sm' : ''
                            }`}
                            onError={(e) => {
                              if (
                                song.localImageUrl &&
                                e.target.src !== song.localImageUrl
                              ) {
                                e.target.src = getUpdatedSongImageUrl(
                                  song.localImageUrl,
                                  song._cacheBust
                                );
                              }
                            }}
                          />

                          {song.id === updatingSongId && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Spinner
                                className="text-white"
                                size="medium"
                                show={true}
                              />
                            </div>
                          )}

                          <div
                            onClick={(e) => {
                              handleEditClick(e, song);
                            }}
                            className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-auto"
                          >
                            <Pencil size={18} className="text-white" />
                          </div>

                          <input
                            type="file"
                            accept="image/*"
                            onClick={(e) => e.stopPropagation()}
                            ref={(ref) =>
                              (fileInputRefs.current[song.id] = ref)
                            }
                            onChange={(e) => handleFileChange(e, song.id)}
                            className="hidden"
                          />
                        </div>

                        {/* Song Info */}
                        <div className="ml-3 flex-1 flex items-center">
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                song.id === currentSongId
                                  ? 'text-[#2b44dd]'
                                  : 'text-white'
                              }`}
                            >
                              {song.song_title}
                            </p>
                            <p className="text-zinc-500 text-xs">
                              {song.artist ? `${song.artist} • ` : ''}
                              {song.song_type}
                            </p>
                          </div>

                          {/* Play button / Duration area */}
                          <div className="flex items-center mr-4">
                            {isProcessing && song.id === currentSongId ? (
                              // Show Spinner when processing the current song
                              <Spinner
                                className="text-white"
                                size="small"
                                show={true}
                              />
                            ) : song.id === currentSongId ? (
                              // Show EqualizerBars when this song is playing and not processing
                              <EqualizerBars
                                isBarsPlaying={isPlaying}
                                size="md"
                                color="#2b44dd"
                              />
                            ) : (
                              // When not playing or processing, show duration by default and play icon on hover
                              <>
                                <p className="text-zinc-300 text-xs font-semibold group-hover:hidden">
                                  {formatDuration(Number(song.song_duration)) ||
                                    '~~'}
                                </p>

                                <div className="hidden group-hover:flex items-center justify-center">
                                  <Play size={20} className="text-white" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6">
                    <p className="text-white text-base mb-6 font-medium">
                      No songs found in this playlist
                    </p>

                    {/* Add Song Button */}
                    <button
                      onClick={() => setShowAddSongModal(true)}
                      className="bg-[#2b44dd] hover:bg-opacity-80 text-white py-2 px-6 rounded-md flex items-center justify-center transition-colors"
                    >
                      <PlusCircle size={20} className="mr-2" />
                      Add a Song
                    </button>
                  </div>
                )}

                {/* Add Song Button (when songs exist) */}
                {playlistSongs.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setShowAddSongModal(true)}
                      className="bg-[#2b44dd] hover:bg-opacity-80 text-white py-2 px-6 rounded-md flex items-center justify-center transition-colors"
                    >
                      <PlusCircle size={20} className="mr-2" />
                      Add a Song
                    </button>
                  </div>
                )}

                {/* Footer note */}
                <div className="mt-8 text-center text-zinc-500 text-xs">
                  Playlist will replay after last track
                </div>
              </div>
            ) : (
              /* -------------------------
                 PLAYLIST LIST VIEW
                 ------------------------- */
              <>
                <h3 className="text-zinc-400 font-medium mb-4">
                  Your Playlists
                </h3>

                <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                  {loading ? (
                    <p className="text-zinc-500 text-sm">
                      Loading playlists...
                    </p>
                  ) : playlists.length > 0 ? (
                    playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="flex items-center group cursor-pointer"
                        onClick={() => handleSelectPlaylist(playlist)}
                      >
                        <div className="relative w-12 h-12 bg-zinc-800 flex-shrink-0 rounded overflow-hidden group cursor-pointer">
                          <img
                            src={getPlaylistImageUrl(playlist.playlist_img)}
                            alt={`${playlist.name} playlist`}
                            className="w-full h-full object-cover"
                          />
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaylistImageClick(playlist.id);
                            }}
                            className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-auto"
                          >
                            <Pencil size={18} className="text-white" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onClick={(e) => e.stopPropagation()}
                            ref={(ref) =>
                              (playlistFileInputRefs.current[playlist.id] = ref)
                            }
                            onChange={(e) =>
                              handlePlaylistFileChange(e, playlist.id)
                            }
                            className="hidden"
                          />
                        </div>

                        <div className="ml-3">
                          <p className="text-white text-sm font-medium group-hover:text-[#2b44dd] transition-colors">
                            {playlist.name}
                          </p>
                          <p className="text-zinc-500 text-xs">Playlist</p>
                        </div>
                        <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white">
                          <Share size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500 text-sm">No playlists found</p>
                  )}
                </div>

                {/* Playlist Buttons */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full text-white py-2 px-4 rounded-md flex items-center justify-center bg-[#2b44dd] hover:bg-opacity-80 transition-colors"
                  >
                    <ListMusic size={18} className="mr-2" />
                    Create playlist
                  </button>
                  <button className="w-full text-white py-2 px-4 rounded-md flex items-center justify-center border border-zinc-700 hover:bg-zinc-800 transition-colors">
                    <ListPlus size={18} className="mr-2" />
                    Add playlist
                  </button>
                </div>

                {/* Log out Button */}
                <div className="absolute bottom-6 left-5">
                  <button
                    onClick={handleLogout}
                    className="border border-zinc-700 text-white py-2 px-4 rounded-full flex items-center hover:bg-zinc-800 transition-colors"
                  >
                    <LogOut size={18} className="mr-2" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <DeletePlaylistModal
            playlist={selectedPlaylist}
            onClose={() => setShowDeleteModal(false)}
            onDeleteSuccess={() => {
              handleBackToList();
            }}
          />
        )}
        {showEditModal && editingSong && (
          <EditSongModal
            song={editingSong}
            // Make sure we have a playlist ID to pass
            playlistId={editingSong?.playlist_id || ''}
            onClose={() => setShowEditModal(false)}
            onSuccess={(updatedSong) => {
              // Inline the update logic to avoid references to undefined variables
              setPlaylistSongs((prevSongs) =>
                prevSongs.map((song) =>
                  song.id === updatedSong.id
                    ? { ...updatedSong, _cacheBust: Date.now() }
                    : song
                )
              );
              setShowEditModal(false);
            }}
          />
        )}
      </div>
    </>
  );
}
