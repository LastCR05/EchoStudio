{/* Auth Sidebar */}
<div
className={`fixed top-0 left-0 h-full w-[350px] bg-[#101010] z-50 transition-transform duration-300 ${
  showAuthSidebar ? 'translate-x-0' : '-translate-x-full'
}`}
>
{/* Close button */}
<div className="p-5">
  <button
    onClick={() => setShowAuthSidebar(false)}
    className="absolute top-8 right-6 text-zinc-400 hover:text-white transition-colors"
  >
    <X size={24} />
  </button>
</div>

{/* Profile Section */}
<div className="px-5 pt-2 pb-6">
  <div className="flex items-center">
    <div className="bg-[#2b44dd] w-16 h-16 flex items-center justify-center text-white text-2xl font-semibold rounded-md">
      A
    </div>
    <div className="ml-4">
      <h2 className="text-white text-xl font-semibold">Abdulsela m</h2>
      <p className="text-zinc-400 text-sm">@sallam.mn@gmail.com</p>
    </div>
  </div>
</div>

{/* Playlists Section */}
<div className="px-5">
  <h3 className="text-zinc-400 font-medium mb-4">Your Playlists</h3>

  <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
    {playlists.map((playlist) => (
      <div
        key={playlist.id}
        className="flex items-center group cursor-pointer"
      >
        <div className="w-12 h-12 bg-zinc-800 flex-shrink-0 rounded overflow-hidden">
          <img
            src="/placeholder.png"
            alt={`${playlist.name} playlist`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="ml-3">
          <p className="text-white text-sm font-medium group-hover:text-[#2b44dd] transition-colors">
            {playlist.name}
          </p>
          <p className="text-zinc-500 text-xs">Playlist</p>
        </div>
        <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    ))}
  </div>

  {/* Playlist Buttons */}
  <div className="mt-6 space-y-2">
    <button className="w-full text-white py-2 px-4 rounded-md flex items-center justify-center bg-[#2b44dd] hover:bg-opacity-80 transition-colors">
      <ListMusic size={18} className="mr-2" />
      Create playlist
    </button>
    <button className="w-full text-white py-2 px-4 rounded-md flex items-center justify-center border border-zinc-700 hover:bg-zinc-800 transition-colors">
      <ListPlus size={18} className="mr-2" />
      Add playlist
    </button>
  </div>
  <div className="absolute bottom-6 left-5">
    <button className="border border-zinc-700 text-white py-2 px-4 rounded-full flex items-center hover:bg-zinc-800 transition-colors">
      <LogOut size={18} className="mr-2" />
      Log out
    </button>
  </div>
</div>