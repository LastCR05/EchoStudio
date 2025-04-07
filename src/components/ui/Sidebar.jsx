'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Settings,
  Heart,
  RefreshCcw,
  Info,
  Download,
  AudioLines,
  LogIn,
  ListMusic,
} from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import AuthSidebar from './AuthSidebar';

const Sidebar = ({
  onYoutubeSongSelect,
  currentSongIndex,
  currentSongId,
  isPlaying,
  isProcessing,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const initialSelected = pathname === '/' ? 'convert' : pathname.slice(1);
  const [selected, setSelected] = useState(initialSelected);
  const [showAuthSidebar, setShowAuthSidebar] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSelected(pathname === '/' ? 'convert' : pathname.slice(1));
  }, [pathname]);

  // Add this effect to check for user session
  useEffect(() => {
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

  const menuItems = {
    top: [
      { id: 'convert', label: 'Convert', icon: Download },
      { id: 'edit', label: 'Edit', icon: AudioLines },
    ],
    bottom: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'donate', label: 'Donate', icon: Heart },
      { id: 'updates', label: 'Updates', icon: RefreshCcw },
      { id: 'about', label: 'About', icon: Info },
    ],
  };

  const handleClick = (id) => {
    setSelected(id);
    router.push(id === 'convert' ? '/' : `/${id}`);
  };

  const renderMenuItem = (item) => {
    const href = item.id === 'convert' ? '/' : `/${item.id}`;

    return (
      <a
        key={item.id}
        href={href}
        onClick={(e) => {
          e.preventDefault(); // prevent default navigation
          handleClick(item.id); // custom router push
        }}
        className={`flex flex-col items-center justify-center w-[64px] h-[49px] sm:w-[80px] sm:h-[63px] rounded-xl transition-all duration-150 active:scale-95 ${
          selected === item.id
            ? 'bg-white shadow-md animate-button-pop'
            : 'hover:bg-zinc-800'
        }`}
      >
        {React.createElement(item.icon, {
          size: 24,
          className: selected === item.id ? 'text-black' : 'text-zinc-400',
        })}
        <span className="text-[11px] text-zinc-400">{item.label}</span>
      </a>
    );
  };

  return (
    <>
      <aside className="fixed bottom-0 w-full h-16 bg-[#101010] flex items-center sm:top-0 sm:left-0 sm:h-screen sm:w-[85px] sm:flex-col sm:py-4">
        {/* Desktop sidebar header (only visible on sm and up) */}
        <div className="w-full flex items-center justify-center hidden sm:block sm:mb-4">
          <a
            href="/edit"
            onClick={(e) => {
              e.preventDefault();
              setShowAuthSidebar(true);
            }}
            className="flex flex-col items-center justify-center w-[64px] h-[49px] sm:w-[80px] sm:h-[63px] hover:bg-zinc-800 rounded-xl"
          >
            {session ? (
              <>
                <ListMusic size={24} className="text-zinc-400" />
                <span className="text-[11px] text-zinc-400">Playlists</span>
              </>
            ) : (
              <>
                <LogIn size={24} className="text-zinc-400" />
                <span className="text-[11px] text-zinc-400">Log In</span>
              </>
            )}
          </a>
        </div>

        {/* Desktop top menu items (hidden on mobile) */}
        <div className="hidden sm:flex sm:flex-col sm:items-center">
          {menuItems.top.map((item) => renderMenuItem(item))}
        </div>

        {/* Desktop bottom menu items (hidden on mobile) */}
        <div className="hidden sm:flex sm:mt-auto sm:flex-col sm:items-center sm:gap-1">
          {menuItems.bottom.map((item) => renderMenuItem(item))}
        </div>

        {/* Mobile menu items with horizontal scroll */}
        <div className="w-full overflow-x-auto scrollbar-hide flex items-center sm:hidden px-2">
          <div className="flex items-center gap-2 px-2">
            {/* Login/Playlist button for mobile */}
            <button
              onClick={() => setShowAuthSidebar(true)}
              className="flex flex-col items-center justify-center min-w-[64px] h-[49px] hover:bg-zinc-800 rounded-xl"
            >
              {session ? (
                <>
                  <ListMusic size={24} className="text-zinc-400" />
                  <span className="text-[11px] text-zinc-400">Playlists</span>
                </>
              ) : (
                <>
                  <LogIn size={24} className="text-zinc-400" />
                  <span className="text-[11px] text-zinc-400">Log In</span>
                </>
              )}
            </button>

            {/* Top menu items */}
            {menuItems.top.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`flex flex-col items-center justify-center min-w-[64px] h-[49px] rounded-xl transition-all duration-150 active:scale-95 ${
                  selected === item.id
                    ? 'bg-white shadow-md animate-button-pop'
                    : 'hover:bg-zinc-800'
                }`}
              >
                {React.createElement(item.icon, {
                  size: 24,
                  className:
                    selected === item.id ? 'text-black' : 'text-zinc-400',
                })}
                <span className="text-[11px] text-zinc-400">{item.label}</span>
              </button>
            ))}

            {/* Bottom menu items */}
            {menuItems.bottom.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`flex flex-col items-center justify-center min-w-[64px] h-[49px] rounded-xl transition-all duration-150 active:scale-95 ${
                  selected === item.id
                    ? 'bg-white shadow-md animate-button-pop'
                    : 'hover:bg-zinc-800'
                }`}
              >
                {React.createElement(item.icon, {
                  size: 24,
                  className:
                    selected === item.id ? 'text-black' : 'text-zinc-400',
                })}
                <span className="text-[11px] text-zinc-400">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <AuthSidebar
        show={showAuthSidebar}
        onClose={() => setShowAuthSidebar(false)}
        onYoutubeSongSelect={onYoutubeSongSelect}
        currentSongIndex={currentSongIndex}
        currentSongId={currentSongId}
        isPlaying={isPlaying}
        isProcessing={isProcessing}
      />
    </>
  );
};

export default Sidebar;
