'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import Sidebar from '@/components/ui/Sidebar';
import Image from 'next/image';
import { Spinner } from '@/components/ui/Spinner';
import lamejs from 'lamejs';
import { Mp3Encoder } from 'lamejs';

import {
  Clipboard,
  Link,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  Volume1,
  Snail,
  Gauge,
  Activity,
  Wind,
  CloudRain,
  Leaf,
  Flame,
  Download,
  RefreshCcw,
  ChevronsRight,
  CloudUpload,
} from 'lucide-react';

import { downloadProcessedAudio } from '../lib/audioProcessing';
import { downloadProcessedAudioMP3 } from '../lib/audioProcessingMP3';
import { processFile as processFileHelper } from '../lib/processFile';
import { toast } from 'react-hot-toast';

const Edit = () => {
  const iconColor = '#2b44dd';

  // --- State ---
  const [selectedTab, setSelectedTab] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopState, setLoopState] = useState('no-loop');
  const [reverbDecay, setReverbDecay] = useState(0.01);
  const [bassBoost, setBassBoost] = useState(0);
  const [originalFileName, setOriginalFileName] = useState('');

  const [showRainControl, setShowRainControl] = useState(false);
  const [showWindControl, setShowWindControl] = useState(false);
  const [showGreenControl, setShowGreenControl] = useState(false);
  const [showFireControl, setShowFireControl] = useState(false);
  // Volume for each background effect (range: 0 to 100)
  const [rainVolume, setRainVolume] = useState(0);
  const [windVolume, setWindVolume] = useState(0);
  const [greenVolume, setGreenVolume] = useState(0);
  const [fireVolume, setFireVolume] = useState(0);

  // Sliders
  const [volume, setVolume] = useState(100);
  const [nightcore, setNightcore] = useState(1.25);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Tone references
  const playerRef = useRef(null);
  const fileInputRef = useRef(null);
  const playbackStartTimeRef = useRef(0);
  const accumulatedTimeRef = useRef(0);
  const rainPlayerRef = useRef(null);
  const windPlayerRef = useRef(null);
  const greenPlayerRef = useRef(null);
  const firePlayerRef = useRef(null);
  const bassFilterRef = useRef(null);

  // Effect chain references
  const reverbRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const masterGainRef = useRef(null);
  const rainGainRef = useRef(null);
  const windGainRef = useRef(null);
  const greenGainRef = useRef(null);
  const fireGainRef = useRef(null);

  // New state to store the current playlist and the active song index.
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [currentSongId, setCurrentSongId] = useState(null);

  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState([]);

  // Initialize audio context and effects chain
  useEffect(() => {
    // Start the Tone.js audio context
    Tone.start();

    // 1. Create a master gain node for overall volume control.
    masterGainRef.current = new Tone.Gain(1).toDestination();

    // 2. Create dry and wet gain nodes for mixing the original (dry) and reverb (wet) signals.
    dryGainRef.current = new Tone.Gain(1).connect(masterGainRef.current);
    wetGainRef.current = new Tone.Gain(0).connect(masterGainRef.current);

    // 3. Initialize the bass filter as a peaking filter.
    //    - frequency: targets sub-bass (80 Hz in this example)
    //    - Q: controls the bandwidth of the boost (a higher Q is narrower)
    //    - gain: the current bass boost value from state
    bassFilterRef.current = new Tone.Filter({
      type: 'peaking',
      frequency: 80, // targets sub-bass frequencies
      Q: 3, // moderate bandwidth for the boost
      gain: bassBoost,
    });
    // Route the bass filter into the dry signal chain
    bassFilterRef.current.connect(dryGainRef.current);

    // 4. Create the reverb effect to add ambience.
    reverbRef.current = new Tone.Reverb({
      decay: 0.01,
      wet: 1.0, // fully wet output (mix controlled by wetGain)
      preDelay: 0.01,
    }).connect(wetGainRef.current);

    // Generate the impulse response for the reverb.
    reverbRef.current.generate();

    rainGainRef.current = new Tone.Gain(rainVolume / 100).toDestination();
    windGainRef.current = new Tone.Gain(windVolume / 100).toDestination();
    greenGainRef.current = new Tone.Gain(greenVolume / 100).toDestination();
    fireGainRef.current = new Tone.Gain(fireVolume / 100).toDestination();

    // -------------------------------
    // Cleanup: Dispose nodes on component unmount.
    return () => {
      // Dispose the reverb effect and its associated gain nodes.
      if (reverbRef.current) {
        reverbRef.current.dispose();
      }
      if (dryGainRef.current) {
        dryGainRef.current.dispose();
      }
      if (wetGainRef.current) {
        wetGainRef.current.dispose();
      }
      if (masterGainRef.current) {
        masterGainRef.current.dispose();
      }
      // Dispose the main player if it exists.
      if (playerRef.current) {
        playerRef.current.dispose();
      }
      // Dispose background effects players and gains.
      if (rainPlayerRef.current) {
        rainPlayerRef.current.dispose();
      }
      if (windPlayerRef.current) {
        windPlayerRef.current.dispose();
      }
      if (greenPlayerRef.current) {
        greenPlayerRef.current.dispose();
      }
      if (rainGainRef.current) {
        rainGainRef.current.dispose();
      }
      if (windGainRef.current) {
        windGainRef.current.dispose();
      }
      if (greenGainRef.current) {
        greenGainRef.current.dispose();
      }
    };
  }, []);

  const processFile = async (file) => {
    setIsProcessing(true);
    setOriginalFileName(file.name);
    try {
      // Use the helper from the separate file to decode the audio file
      const audioBuffer = await processFileHelper(file);

      // Stop any existing player
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
      }

      // Create a new Tone.Player with the decoded AudioBuffer
      const player = new Tone.Player(audioBuffer);
      player.loop = loopState;
      player.playbackRate = nightcore;

      // Fan out the player's output to both dry and wet paths
      player.fan(bassFilterRef.current, reverbRef.current);

      // Apply the current volume setting
      const gainFactor = volume / 100;
      masterGainRef.current.gain.value = gainFactor;

      // Apply reverb wet/dry mix
      wetGainRef.current.gain.value = 1;
      dryGainRef.current.gain.value = 1;

      // Save the player reference and update UI states
      playerRef.current = player;

      if (player) {
        player.start(); // Automatically start playing
        setIsPlaying(true); // Update playing state
        playbackStartTimeRef.current = Tone.now(); // Set start time
        accumulatedTimeRef.current = 0; // Reset accumulated time
      }
      setDuration(player.buffer.duration);
      setFileLoaded(true);
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e) => e.preventDefault();
  const handleDragLeave = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    if (!e.dataTransfer.files[0]) return;
    processFile(e.dataTransfer.files[0]);
  };

  // --- File Input Handler ---
  const handleFileChange = (e) => {
    if (!e.target.files[0]) return;
    processFile(e.target.files[0]);
  };

  const handleAreaClick = () => {
    fileInputRef.current.click();
  };

  // Toggle playback
  const togglePlayback = async () => {
    await Tone.start();
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.stop();
        setIsPlaying(false);
      } else {
        accumulatedTimeRef.current = currentTime;
        playbackStartTimeRef.current = Tone.now() - currentTime;
        playerRef.current.start(undefined, currentTime);
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    let interval;
    if (isPlaying && playerRef.current) {
      interval = setInterval(async () => {
        const increment = 0.1 * nightcore;
        accumulatedTimeRef.current += increment;
        let elapsed = accumulatedTimeRef.current;

        if (elapsed >= duration) {
          // Check if we're already processing a song change (from user click)
          // If so, just stop the current song but don't try to load the next one
          if (isProcessing) {
            clearInterval(interval);
            setCurrentTime(0);
            playerRef.current.stop();
            setIsPlaying(false);
            playbackStartTimeRef.current = 0;
            accumulatedTimeRef.current = 0;
            return;
          }

          if (loopState === 'no-loop') {
            if (isShuffle) {
              clearInterval(interval);
              // Find current song's position in the shuffle order
              const currentShuffleIndex = shuffleOrder.findIndex(
                (idx) => idx === currentSongIndex
              );
              // Get next song index from shuffle order
              const nextShuffleIndex =
                (currentShuffleIndex + 1) % shuffleOrder.length;
              const nextSongIndex = shuffleOrder[nextShuffleIndex];

              // Stop current player
              playerRef.current.stop();
              setIsPlaying(false);
              playbackStartTimeRef.current = 0;
              accumulatedTimeRef.current = 0;
              setCurrentTime(0);

              // Set next song
              setCurrentSongIndex(nextSongIndex);
              playbackStartTimeRef.current = Tone.now();
              await handleYoutubeUrl(
                currentPlaylist[nextSongIndex].song_source
              );
            } else {
              // Original no-loop, no-shuffle behavior
              clearInterval(interval);
              setCurrentTime(0);
              playerRef.current.stop();
              setIsPlaying(false);
              playbackStartTimeRef.current = 0;
              accumulatedTimeRef.current = 0;
            }
          } else if (loopState === 'all-loop') {
            clearInterval(interval);
            // Stop current player, then fetch and play the next song.
            playerRef.current.stop();
            setIsPlaying(false);
            playbackStartTimeRef.current = 0;
            accumulatedTimeRef.current = 0;
            setCurrentTime(0);

            let nextIndex = currentSongIndex + 1;
            if (nextIndex >= currentPlaylist.length) {
              nextIndex = 0;
            }
            setCurrentSongIndex(nextIndex);
            playbackStartTimeRef.current = Tone.now();
            await handleYoutubeUrl(currentPlaylist[nextIndex].song_source);
          } else if (loopState === 'loop-one') {
            // Still clear the interval, but create a new one
            clearInterval(interval);

            // Reset everything
            accumulatedTimeRef.current = 0;
            setCurrentTime(0);
            playbackStartTimeRef.current = Tone.now();

            // Stop first, then start after a small delay
            playerRef.current.stop();

            // Use setTimeout to ensure a complete restart
            setTimeout(() => {
              playerRef.current.start();

              // Create a new interval for tracking this new playback
              interval = setInterval(() => {
                const increment = 0.1 * nightcore;
                accumulatedTimeRef.current += increment;
                setCurrentTime(accumulatedTimeRef.current);
              }, 100);
            }, 50);
          }
        } else {
          setCurrentTime(elapsed);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [
    isPlaying,
    duration,
    nightcore,
    loopState,
    currentSongIndex,
    currentPlaylist,
    isShuffle,
    shuffleOrder,
    isProcessing, // Add isProcessing to the dependency array
  ]);

  const toggleLoop = () => {
    if (loopState === 'no-loop') {
      setLoopState('all-loop');
    } else if (loopState === 'all-loop') {
      setLoopState('loop-one');
    } else if (loopState === 'loop-one') {
      setLoopState('no-loop');
    }
  };

  const toggleShuffle = () => {
    if (!currentPlaylist.length) return;
    if (!isShuffle) {
      // Create an array [0, 1, 2, …, n-1]
      let order = [...Array(currentPlaylist.length).keys()];
      // Shuffle it using Fisher-Yates
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      setShuffleOrder(order);
      setIsShuffle(true);
      // Ensure loop mode is off when shuffling
      setLoopState('no-loop');
    } else {
      setIsShuffle(false);
      setShuffleOrder([]);
    }
  };

  // Update reverb parameters when decay changes
  useEffect(() => {
    if (reverbRef.current) {
      try {
        // Need to recreate reverb to apply decay changes
        const recreateReverb = async () => {
          // Create a new reverb effect with the updated decay
          const newReverb = new Tone.Reverb({
            decay: reverbDecay,
            wet: 1.0, // Always fully wet since we control mix with gain nodes
            preDelay: 0.01,
          });

          // Wait for the reverb to be ready (important!)
          await newReverb.generate();

          // Connect new reverb to wet gain node
          newReverb.connect(wetGainRef.current);

          // If we have a player, reconnect it
          if (playerRef.current) {
            playerRef.current.disconnect(reverbRef.current);
            playerRef.current.connect(newReverb);
          }

          // Dispose the old reverb and update reference
          if (reverbRef.current) {
            reverbRef.current.dispose();
          }
          reverbRef.current = newReverb;

          // Update the wet gain value based on reverb amount
          wetGainRef.current.gain.value = 1;
        };

        recreateReverb();
      } catch (error) {
        console.error('Error updating reverb:', error);
      }
    }
  }, [reverbDecay]);

  useEffect(() => {
    if (bassFilterRef.current) {
      // Directly set the filter gain in dB
      bassFilterRef.current.gain.value = bassBoost;
    }
  }, [bassBoost]);

  // --- Sliders Logic ---
  // Volume slider
  const handleVolumeChange = (val) => {
    const vol = val[0];
    setVolume(vol);
    if (masterGainRef.current) {
      const gainFactor = vol / 100;
      masterGainRef.current.gain.value = gainFactor;
    }
  };

  // Nightcore slider
  const handleNightcoreChange = (val) => {
    const speed = val[0];
    setNightcore(speed);
    if (playerRef.current) {
      playerRef.current.playbackRate = speed;
    }
  };

  // Format time as M:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  // Helper function to gather download options
  const getDownloadOptions = () => ({
    playerBuffer: playerRef.current?.buffer,
    volume,
    nightcore,
    reverbDecay,
    bassBoost,
    originalFileName,
    backgroundEffects: {
      showRainControl,
      rainPlayerBuffer: rainPlayerRef.current?.buffer,
      rainVolume,
      showWindControl,
      windPlayerBuffer: windPlayerRef.current?.buffer,
      windVolume,
      showGreenControl,
      greenPlayerBuffer: greenPlayerRef.current?.buffer,
      greenVolume,
      showFireControl,
      firePlayerBuffer: firePlayerRef.current?.buffer,
      fireVolume,
    },
  });

  //Youtube to mp3
  const handleYoutubeUrl = async (youtubeUrl) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/youtube-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch audio stream');
      }

      // Check if the response is JSON (fallback) or audio data
      const contentType = response.headers.get('content-type');
      let audioBuffer;

      if (contentType.includes('application/json')) {
        // Handle fallback URL case
        const { audioUrl, fallback } = await response.json();
        if (!audioUrl) {
          throw new Error('No audio URL provided');
        }

        // Fetch the audio from the provided URL
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          throw new Error('Failed to fetch audio from fallback URL');
        }

        audioBuffer = await audioResponse.arrayBuffer();
      } else {
        // Direct audio data
        audioBuffer = await response.arrayBuffer();
      }

      // Decode the audio with Tone.js
      const audioData = await Tone.context.decodeAudioData(audioBuffer);

      // Set up your Tone.Player as usual
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
      }

      const player = new Tone.Player(audioData);
      player.fan(bassFilterRef.current, reverbRef.current);
      player.loop = loopState;
      player.playbackRate = nightcore;
      playerRef.current = player;

      masterGainRef.current.gain.value = volume / 100;
      wetGainRef.current.gain.value = 1;
      dryGainRef.current.gain.value = 1;

      setDuration(player.buffer.duration);
      setFileLoaded(true);

      if (player) {
        player.start(); // Automatically start playing
        setIsPlaying(true); // Update playing state
        playbackStartTimeRef.current = Tone.now(); // Set start time
        accumulatedTimeRef.current = 0; // Reset accumulated time
      }
    } catch (error) {
      console.error('Error processing YouTube URL:', error);
      toast.error(error.message || 'Failed to process YouTube video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSongSelect = async (song, playlist) => {
    // Update state to store the playlist and the active song index
    setCurrentPlaylist(playlist);
    setCurrentSongIndex(song.index);
    setCurrentSongId(song.id);

    // Now extract the YouTube link from the song object
    await handleYoutubeUrl(song.song_source);
  };

  // Helper function to validate YouTube URLs
  const isValidYoutubeUrl = (url) => {
    const ytRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;
    return ytRegex.test(url);
  };

  // Add this in your useEffect to set up the paste event listener
  useEffect(() => {
    const handlePaste = async (e) => {
      // Check if we're focused on the YouTube input field
      const activeElement = document.activeElement;
      if (activeElement && activeElement.id === 'youtubeUrlInput') {
        return; // Let the input handle its own paste event
      }

      // Get pasted text
      const pastedText = e.clipboardData.getData('text');

      // If it looks like a YouTube URL, process it
      if (isValidYoutubeUrl(pastedText)) {
        e.preventDefault();
        // Update the input field with the URL
        const input = document.getElementById('youtubeUrlInput');
        if (input) {
          input.value = pastedText;
          handleYoutubeUrl(pastedText);
        }
      }
    };

    // Add the event listener
    window.addEventListener('paste', handlePaste);

    // Clean up
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const goToNextSong = async () => {
    // If already processing a song change, ignore this request
    if (isProcessing || !currentPlaylist.length || currentSongIndex === null)
      return;

    let nextIndex;
    if (isShuffle && shuffleOrder.length > 0) {
      // Find the current song's position in the shuffle order.
      let currentShuffleIndex = shuffleOrder.indexOf(currentSongIndex);
      let nextShuffleIndex = currentShuffleIndex + 1;
      if (nextShuffleIndex >= shuffleOrder.length) {
        nextShuffleIndex = 0;
      }
      nextIndex = shuffleOrder[nextShuffleIndex];
    } else {
      nextIndex = currentSongIndex + 1;
      if (nextIndex >= currentPlaylist.length) {
        // Optional: loop back to the beginning
        nextIndex = 0;
      }
    }

    // Only proceed if we have a valid next index
    if (nextIndex < currentPlaylist.length) {
      // Update both index and ID
      setCurrentSongIndex(nextIndex);
      setCurrentSongId(currentPlaylist[nextIndex].id);
      await handleYoutubeUrl(currentPlaylist[nextIndex].song_source);
    }
  };

  const goToPreviousSong = async () => {
    // If already processing a song change, ignore this request
    if (isProcessing || !currentPlaylist.length || currentSongIndex === null)
      return;

    let prevIndex;
    if (isShuffle && shuffleOrder.length > 0) {
      let currentShuffleIndex = shuffleOrder.indexOf(currentSongIndex);
      let prevShuffleIndex = currentShuffleIndex - 1;
      if (prevShuffleIndex < 0) {
        prevShuffleIndex = shuffleOrder.length - 1;
      }
      prevIndex = shuffleOrder[prevShuffleIndex];
    } else {
      prevIndex = currentSongIndex - 1;
      if (prevIndex < 0) {
        // Optional: loop to the end
        prevIndex = currentPlaylist.length - 1;
      }
    }

    // Only proceed if we have a valid previous index
    if (prevIndex >= 0 && prevIndex < currentPlaylist.length) {
      // Update both index and ID
      setCurrentSongIndex(prevIndex);
      setCurrentSongId(currentPlaylist[prevIndex].id);
      await handleYoutubeUrl(currentPlaylist[prevIndex].song_source);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex relative">
      {/* Main content area */}
      <div className="flex-1 sm:py-3 sm:pl-[85px] flex flex-col items-center">
        <div className="flex flex-col items-center mt-3 xl:mt-8 mb-3 max-w-[700px] w-full px-5 sm:px-10 xl:mb-6 ">
          {/* Logo */}
          <div className="h-14 w-14 mb-3 ml-2">
            <a href="/edit">
              <Image
                src="/icons/heart.svg"
                width={100}
                height={100}
                alt="heart"
              />
            </a>
          </div>

          {/* Input and Paste Button Row */}
          {!fileLoaded && (
            <>
              <div className="flex w-full items-center xsm:flex-col xsm:gap-4 mb-12 sm:mb-28">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Link size={18} color={iconColor} />
                  </div>
                  <Input
                    type="text"
                    placeholder="paste the YouTube link here"
                    className="bg-zinc-900 border border-zinc-700 text-white w-full pl-10 pr-12 focus:border-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleYoutubeUrl(e.target.value);
                      }
                    }}
                    id="youtubeUrlInput"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('youtubeUrlInput');
                      handleYoutubeUrl(input.value);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 group"
                  >
                    <ChevronsRight
                      size={23}
                      color={iconColor}
                      className="transition-colors group-hover:text-white"
                    />
                  </button>
                </div>
                <Button
                  variant="secondary"
                  className="ml-2"
                  onClick={async () => {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      const input = document.getElementById('youtubeUrlInput');
                      if (input) {
                        input.value = text;
                        handleYoutubeUrl(text);
                      }
                    }
                  }}
                >
                  <Clipboard size={18} color={iconColor} className="mr-2" />
                  Paste
                </Button>
              </div>
              <div className="mb-4 text-center text-zinc-400 text-xl">or</div>
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Drag and drop area or Player UI */}
        {!fileLoaded ? (
          <div className="w-full max-w-[900px] flex px-4  transition-all cursor-pointer ">
            <div
              className="w-full max-w-[900px] h-[170px] flex items-center justify-center
          outline-2 outline-dashed outline-zinc-700 outline-offset-4 
          rounded-md transition-transform duration-200 hover:scale-105 cursor-pointer
          m-4"
              onClick={handleAreaClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <Spinner className="text-white" size="large" show={true}>
                  Loading...
                </Spinner>
              ) : (
                <div className="flex flex-col justify-center items-center">
                  <span className="text-zinc-100 font-bold">
                    drag and drop a song here
                  </span>
                  <span className="text-zinc-700">MP3, WAV, MP4, FLAC....</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Audio Player UI when file is loaded
          <div className="w-full max-w-[1000px] mt-4 px-4 py-2">
            {/* Playback Controls */}
            <div className="flex justify-between max-w-[300px] items-center mb-6 m-auto">
              {/* Shuffle Button (disabled) */}
              <Button
                variant={isShuffle ? 'selected' : 'secondary'}
                onClick={toggleShuffle}
                disabled={!currentPlaylist.length || loopState !== 'no-loop'}
              >
                <Shuffle size={20} color={iconColor} />
              </Button>

              {/* Previous Button (placeholder) */}
              <Button variant="ghost" onClick={goToPreviousSong}>
                <SkipBack size={24} color="#a1a1aa" />
              </Button>

              {/* Play/Pause Button */}
              <div className="relative inline-block">
                <Button
                  variant="player"
                  size="player"
                  onClick={togglePlayback}
                  className={`ml-0 ${isProcessing ? 'blur-sm' : ''}`}
                >
                  {isPlaying ? (
                    <Pause size={24} color="#2b44dd" fill="#2b44dd" />
                  ) : (
                    <Play size={24} color="#2b44dd" fill="#2b44dd" />
                  )}
                </Button>
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <Spinner className="text-white" size="large" show={true} />
                  </div>
                )}
              </div>

              <Button variant="ghost" onClick={goToNextSong}>
                <SkipForward size={24} color="#a1a5aa" />
              </Button>

              {/* Loop Button */}
              <Button
                variant="player"
                onClick={toggleLoop}
                size="icon"
                disabled={!currentPlaylist || currentPlaylist.length === 0}
              >
                {loopState === 'no-loop' && (
                  <Repeat size={18} color="#a1a1aa" />
                )}
                {loopState === 'all-loop' && <Repeat size={18} color="white" />}
                {loopState === 'loop-one' && (
                  <Repeat1 size={18} color="white" />
                )}
              </Button>
            </div>

            {/* Song Position / Seek Slider */}
            <div className="w-full max-w-[1000px] flex items-center space-x-2 mb-12 whitespace-nowrap">
              {/* Start time display */}
              <span className="text-sm text-zinc-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>

              <Slider
                value={[currentTime]}
                min={0}
                max={duration}
                step={0.1}
                // Update the UI state immediately on slider change without affecting playback
                onValueChange={(newValue) => {
                  setCurrentTime(newValue[0]);
                  accumulatedTimeRef.current = newValue[0];
                }}
                // Commit the new value only when the user finishes interacting with the slider
                onValueCommit={(newValue) => {
                  const newTime = newValue[0];
                  // If the audio is playing, update the playback position
                  if (playerRef.current && isPlaying) {
                    playerRef.current.stop();
                    playerRef.current.start(undefined, newTime);
                    playbackStartTimeRef.current = Tone.now() - newTime;
                  }
                  // If the audio is paused, the UI updates (from onValueChange) are enough
                }}
                className="w-full"
              />

              {/* End time display */}
              <span className="text-sm text-zinc-400 w-10">
                {formatTime(duration)}
              </span>
            </div>

            <div className="w-full max-w-[700px] mt-4 px-4 py-2 m-auto">
              {/* Volume Slider */}
              <div className="flex flex-col mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white">Volume: {volume}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Volume1 size={20} color="#a1a1aa" />
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    min={0}
                    max={150}
                    step={1}
                    className="w-full"
                  />
                  <Volume2 size={20} color="#a1a1aa" />
                </div>
              </div>

              {/* Nightcore Slider */}
              <div className="flex flex-col mb-8 z-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white">
                    Nightcore: {nightcore.toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Snail size={20} color="#a1a1aa" />

                  <div className="relative w-full">
                    <Slider
                      value={[nightcore]}
                      onValueChange={handleNightcoreChange}
                      min={0.5}
                      max={1.5}
                      step={0.01}
                      className="w-full"
                    />

                    {/* Markers */}
                    <div
                      style={{ left: '76%' }}
                      className="marker-container marker-other"
                    >
                      <div className="relative h-0">
                        <div className="marker-line" />
                      </div>
                      <div className="marker-text">1.25x</div>
                    </div>

                    <div
                      style={{ left: '66.15%' }}
                      className="marker-container marker-other"
                    >
                      <div className="relative h-0">
                        <div className="marker-line" />
                      </div>
                      <div className="marker-text">1.15x</div>
                    </div>

                    <div
                      style={{ left: '51.85%' }}
                      className="marker-container marker-active"
                    >
                      <div className="relative h-0">
                        <div className="marker-line" />
                      </div>
                      <div className="marker-text">1.00x</div>
                    </div>

                    <div
                      style={{ left: '44.75%' }}
                      className="marker-container marker-other"
                    >
                      <div className="relative h-0">
                        <div className="marker-line" />
                      </div>
                      <div className="marker-text">0.93x</div>
                    </div>

                    <div
                      style={{ left: '36.95%' }}
                      className="marker-container marker-other"
                    >
                      <div className="relative h-0">
                        <div className="marker-line" />
                      </div>
                      <div className="marker-text">0.85x</div>
                    </div>
                  </div>

                  <Gauge size={20} color="#a1a1aa" />
                </div>
              </div>

              {/* Reverb Slider */}
              <div className="flex flex-col mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white">
                    Reverb: {reverbDecay.toFixed(2)}s
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Repeat size={20} color="#a1a1aa" />
                  <Slider
                    value={[reverbDecay]}
                    onValueChange={(val) => {
                      setReverbDecay(val[0]);
                    }}
                    min={0.01}
                    max={10}
                    step={0.01}
                    className="w-full"
                  />
                  <span className="text-sm text-zinc-400">10.0s</span>
                </div>
              </div>

              {/* Bass Boost Slider (UI only) */}
              <div className="flex flex-col mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white">Bass Boost: {bassBoost} dB</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity size={20} color="#a1a1aa" />
                  <Slider
                    value={[bassBoost]}
                    onValueChange={(val) => setBassBoost(val[0])}
                    min={-24}
                    max={24}
                    step={0.5}
                    className="w-full"
                  />
                  <Activity size={20} color="#a1a1aa" />
                </div>
              </div>
              {/* Background Effects Section */}
              <div className="flex flex-col mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white">Background Effects</span>
                </div>
                <div className="flex flex-row items-center justify-between ">
                  <Button
                    variant="outline"
                    className={`max-w-[144px] flex-1 flex-col px-1 ${
                      showRainControl
                        ? 'h-[70px] border-[#2b44dd]'
                        : 'h-[42px] border-zinc-500 text-zinc-500'
                    }`}
                    onClick={async () => {
                      // Ensure the Tone.js AudioContext is started
                      await Tone.start();

                      setShowRainControl(!showRainControl);

                      if (!showRainControl) {
                        // Make sure gain node exists before creating player
                        if (!rainGainRef.current) {
                          rainGainRef.current = new Tone.Gain(
                            rainVolume / 125
                          ).connect(Tone.getDestination);
                        }

                        // Only create the player if it doesn't exist
                        if (!rainPlayerRef.current) {
                          console.log('Creating rain player');
                          const player = new Tone.Player({
                            url: '/audio/rain.mp3',
                            loop: true,
                            onload: () => {
                              console.log('Rain audio loaded');
                              // Start player once loaded
                              player.start();
                            },
                          }).connect(rainGainRef.current);
                          rainPlayerRef.current = player;
                        } else {
                          // If player already exists, just start it
                          rainPlayerRef.current.start();
                        }
                      } else {
                        // Stop the player when toggling off
                        rainPlayerRef.current?.stop();
                      }
                    }}
                  >
                    <CloudRain size={24} />
                    {showRainControl && (
                      <div
                        className="w-full px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Slider
                          variant="small"
                          value={[rainVolume]}
                          onValueChange={(val) => {
                            setRainVolume(val[0]);
                            if (rainGainRef.current) {
                              rainGainRef.current.gain.value = val[0] / 100;
                            }
                          }}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className={`max-w-[144px] flex-1 flex-col px-1 ${
                      showWindControl
                        ? 'h-[70px] border-[#2b44dd]'
                        : 'h-[42px] border-zinc-500 text-zinc-500'
                    }`}
                    onClick={async () => {
                      await Tone.start();
                      setShowWindControl(!showWindControl);
                      if (!showWindControl) {
                        if (!windGainRef.current) {
                          windGainRef.current = new Tone.Gain(
                            windVolume / 100
                          ).connect(Tone.getDestination);
                        }
                        if (!windPlayerRef.current) {
                          console.log('Creating wind player');
                          const player = new Tone.Player({
                            url: '/audio/wind.mp3',
                            loop: true,
                            onload: () => {
                              console.log('Wind audio loaded');
                              player.start();
                            },
                          }).connect(windGainRef.current);
                          windPlayerRef.current = player;
                        } else {
                          windPlayerRef.current.start();
                        }
                      } else {
                        windPlayerRef.current?.stop();
                      }
                    }}
                  >
                    <Wind size={24} />
                    {showWindControl && (
                      <div
                        className="w-full px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Slider
                          variant="small"
                          value={[windVolume]}
                          onValueChange={(val) => {
                            setWindVolume(val[0]);
                            if (windGainRef.current) {
                              windGainRef.current.gain.value = val[0] / 100;
                            }
                          }}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className={`max-w-[144px] flex-1 flex-col px-1 ${
                      showGreenControl
                        ? 'h-[70px] border-[#2b44dd]'
                        : 'h-[42px] border-zinc-500 text-zinc-500'
                    }`}
                    onClick={async () => {
                      await Tone.start();
                      setShowGreenControl(!showGreenControl);
                      if (!showGreenControl) {
                        if (!greenGainRef.current) {
                          greenGainRef.current = new Tone.Gain(
                            greenVolume / 100
                          ).connect(Tone.getDestination);
                        }
                        if (!greenPlayerRef.current) {
                          console.log('Creating green player');
                          const player = new Tone.Player({
                            url: '/audio/green.mp3',
                            loop: true,
                            onload: () => {
                              console.log('Green audio loaded');
                              player.start();
                            },
                          }).connect(greenGainRef.current);
                          greenPlayerRef.current = player;
                        } else {
                          greenPlayerRef.current.start();
                        }
                      } else {
                        greenPlayerRef.current?.stop();
                      }
                    }}
                  >
                    <Leaf size={24} />
                    {showGreenControl && (
                      <div
                        className="w-full px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Slider
                          variant="small"
                          value={[greenVolume]}
                          onValueChange={(val) => {
                            setGreenVolume(val[0]);
                            if (greenGainRef.current) {
                              greenGainRef.current.gain.value = val[0] / 100;
                            }
                          }}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className={`max-w-[144px] flex-1 flex-col px-1 ${
                      showFireControl
                        ? 'h-[70px] border-[#2b44dd]'
                        : 'h-[42px] border-zinc-500 text-zinc-500'
                    }`}
                    onClick={async () => {
                      await Tone.start();
                      setShowFireControl(!showFireControl);
                      if (!showFireControl) {
                        if (!fireGainRef.current) {
                          fireGainRef.current = new Tone.Gain(
                            fireVolume / 100
                          ).connect(Tone.getDestination);
                        }
                        if (!firePlayerRef.current) {
                          console.log('Creating fire player');
                          const player = new Tone.Player({
                            url: '/audio/fire.mp3',
                            loop: true,
                            onload: () => {
                              console.log('Fire audio loaded');
                              player.start();
                            },
                          }).connect(fireGainRef.current);
                          firePlayerRef.current = player;
                        } else {
                          firePlayerRef.current.start();
                        }
                      } else {
                        firePlayerRef.current?.stop();
                      }
                    }}
                  >
                    <Flame size={24} />
                    {showFireControl && (
                      <div
                        className="w-full px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Slider
                          variant="small"
                          value={[fireVolume]}
                          onValueChange={(val) => {
                            setFireVolume(val[0]);
                            if (fireGainRef.current) {
                              fireGainRef.current.gain.value = val[0] / 100;
                            }
                          }}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-center items-center flex-col gap-4">
                <Button
                  variant="outline"
                  onClick={() => downloadProcessedAudio(getDownloadOptions())}
                >
                  <Download size={24} /> Download WAV file (raw)
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadProcessedAudioMP3(getDownloadOptions())
                  }
                  className="border-zinc-500 text-zinc-500 hover:border-[#2b44dd] transition-colors duration-200"
                >
                  <RefreshCcw size={24} /> Download MP3 file
                </Button>
                <Button
                  variant="outline"
                  className="border-zinc-500 text-zinc-500 hover:border-[#2b44dd] transition-colors duration-200"
                >
                  <CloudUpload size={24} /> Save to playlist
                </Button>
                {isProcessing && (
                  <Spinner className="text-white" size="large" show={true}>
                    Loading...
                  </Spinner>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Sidebar
        onYoutubeSongSelect={handleSongSelect}
        currentSongIndex={currentSongIndex}
        currentSongId={currentSongId}
        isPlaying={isPlaying}
        isProcessing={isProcessing}
      />
    </main>
  );
};

export default Edit;
