'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Settings,
  Heart,
  RefreshCcw,
  Info,
  Download,
  AudioLines,
  LogIn,
  X,
  LogOut,
  ListMusic,
  ListPlus,
  Github,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
} from 'lucide-react';

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  // State for the selected menu item.
  const initialSelected = pathname === '/' ? 'convert' : pathname.slice(1);
  const [selected, setSelected] = useState(initialSelected);

  // State to control the visibility of the auth sidebar.
  const [showAuthSidebar, setShowAuthSidebar] = useState(false);

  useEffect(() => {
    const newSelected = pathname === '/' ? 'convert' : pathname.slice(1);
    setSelected(newSelected);
  }, [pathname]);

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

  // Sample playlist data
  const playlists = [
    { id: 1, name: 'try' },
    { id: 2, name: 'We go Jim' },
    { id: 3, name: 'Spacetoon' },
    { id: 4, name: 'New' },
    { id: 5, name: 'Study' },
  ];

  const PlaylistView = () => {
    // Sample playlist data
    const playlist = {
      name: "try",
      items: [
        {
          id: 1,
          title: "Summer Time Render - Opening FULL HD [1080p]",
          subtitle: "gfdgfdsgsfd",
          duration: "1:28"
        },
        {
          id: 2,
          title: "attack on titan season 3 ending",
          subtitle: "try",
          duration: "1:30"
        }
      ]
    };

  // Reusable button styling (same as menu items)
  const buttonClasses = `
    flex flex-col items-center justify-center w-[64px] h-[49px] sm:w-[80px] sm:h-[63px]
    rounded-xl transition-all duration-150 active:scale-95 flex-shrink-0
  `;

  const handleClick = (id) => {
    setSelected(id);
    router.push(id === 'convert' ? '/' : `/${id}`);
  };

  // Render a standard menu item button.
  const renderMenuItem = (item) => (
    <button
      key={item.id}
      onClick={() => handleClick(item.id)}
      className={`${buttonClasses} ${
        selected === item.id
          ? 'bg-white shadow-md animate-button-pop'
          : 'hover:bg-zinc-800'
      }`}
    >
      {React.createElement(item.icon, {
        style: { height: '1.3rem', width: '1.3rem' },
        className: selected === item.id ? 'text-black' : 'text-zinc-400',
      })}
      <span className="text-[11px] text-zinc-400">{item.label}</span>
    </button>
  );

  // Render the Log In button using the same design as menu items.
  const renderAuthButton = () => (
    <button
      onClick={() => setShowAuthSidebar(true)}
      className={`${buttonClasses} hover:bg-zinc-800`}
    >
      <LogIn
        size={24}
        style={{ height: '1.3rem', width: '1.3rem' }}
        className="text-zinc-400"
      />
      <span className="text-[11px] text-zinc-400">Log In</span>
    </button>
  );

  return (
    <>
      <aside
        className="fixed bottom-0 w-full h-16 
        flex flex-row items-center
        bg-[#101010] z-50
        overflow-x-scroll max-sm:rounded-t-3xl
        whitespace-nowrap
        sm:top-0 sm:left-0 sm:h-screen sm:w-[85px] 
        sm:flex-col sm:justify-start sm:py-4 sm:overflow-x-hidden"
      >
        {/* Top section with Log In button for desktop */}
        <div className="w-full flex items-center justify-center hidden sm:block sm:mb-4">
          {renderAuthButton()}
        </div>

        {/* Mobile view: include Log In button along with menu items */}
        <div className="min-w-[425px] pl-5 pr-5 sm:hidden">
          <div className="flex flex-row items-center">
            {renderAuthButton()}
            {menuItems.top.map((item) => renderMenuItem(item))}
            {menuItems.bottom.map((item) => renderMenuItem(item))}
          </div>
        </div>

        {/* Desktop view: render remaining menu items */}
        <div className="hidden sm:flex sm:flex-col sm:items-center">
          {menuItems.top.map((item) => renderMenuItem(item))}
        </div>
        <div className="hidden sm:flex sm:mt-auto sm:flex-col sm:items-center sm:gap-1">
          {menuItems.bottom.map((item) => renderMenuItem(item))}
        </div>
      </aside>

      {/* Backdrop overlay for blurring the page */}
      <div
        className={`fixed inset-0 z-40 bg-black bg-opacity-30 backdrop-blur-sm transition-opacity duration-300 ${
          showAuthSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowAuthSidebar(false)}
      />

      {/* Auth Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[350px] bg-[#101010] z-50 transition-transform duration-300 ${
          showAuthSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="bg-black min-h-screen pb-24">
      {/* Header with back button and actions */}
      <div className="fixed top-0 w-full bg-black bg-opacity-90 backdrop-blur-sm z-10 p-4 flex items-center justify-between border-b border-zinc-800">
        <Link href="/playlists" className="text-zinc-400 hover:text-white">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-white text-lg font-medium absolute left-1/2 transform -translate-x-1/2">
          {playlist.name}
        </h1>
        <div className="flex items-center gap-4">
          <button className="text-zinc-400 hover:text-white">
            <Trash2 size={20} />
          </button>
          <button className="text-zinc-400 hover:text-white">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>
      
      {/* Playlist details section */}
      <div className="pt-20 px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-48 h-48 bg-zinc-800 rounded-md overflow-hidden mb-4">
            <Image 
              src="/placeholder.png" 
              alt={playlist.name}
              width={192}
              height={192}
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-white text-2xl font-bold mb-1">{playlist.name}</h2>
          <p className="text-zinc-400 text-sm">{playlist.items.length} tracks • Auto replay</p>
        </div>
        
        {/* Track list */}
        <div className="mt-6">
          {playlist.items.map((item, index) => (
            <div 
              key={item.id}
              className="flex items-center p-3 border-b border-zinc-800 hover:bg-zinc-900 transition-colors"
            >
              <div className="w-8 text-zinc-500 text-center">{index + 1}</div>
              <div className="ml-3 flex-1">
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-zinc-500 text-xs">{item.subtitle}</p>
              </div>
              <div className="text-zinc-400 text-sm">{item.duration}</div>
            </div>
          ))}
        </div>
        
        {/* Footer message */}
        <div className="mt-8 text-center text-zinc-500 text-sm">
          Playlist will replay after last track
        </div>
      </div>
    </div>

      </div>
    </>
  );
};

export default Sidebar;
