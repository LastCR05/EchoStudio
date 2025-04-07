{/* Auth Sidebar */}
<div
className={`fixed top-0 left-0 h-full w-[350px] bg-[#101010] z-50 transition-transform duration-300 ${
  showAuthSidebar ? 'translate-x-0' : '-translate-x-full'
}`}
>
{/* Close button */}

<button
  onClick={() => setShowAuthSidebar(false)}
  className="absolute top-8 right-6 text-zinc-400 hover:text-white transition-colors"
>
  <X size={24} />
</button>

{/* Auth Content */}
<div className="px-5 py-8">
  {/* Title */}
  <h2 className="text-2xl font-semibold text-white max-w-60 text-left">
    Welcome back
  </h2>
  <h4 className="text-sm mt-1 text-zinc-400 max-w-60 text-left">
    Sign in to your account
  </h4>

  <div className="mt-10">
    <div className="flex flex-col gap-3.5">
      {/* Google Button */}
      <button className="flex items-center justify-center gap-3 rounded-full bg-white hover:bg-zinc-100 text-black py-2.5 px-4 text-sm font-medium border border-zinc-300 transition-colors">
        <Image
          src="/icons/google.svg"
          alt="Google"
          width={18}
          height={18}
        />
        Continue with Google
      </button>

      {/* GitHub Button */}
      <button className="flex items-center justify-center gap-3 rounded-full bg-black hover:bg-zinc-900 text-white py-2.5 px-4 text-sm font-medium border border-zinc-800 transition-colors">
        <Github className="w-4 h-4 text-white" />
        Continue with GitHub
      </button>

      {/* Discord Button */}
      <button className="flex items-center justify-center gap-3 rounded-full bg-[#5865F2] hover:bg-[#4e5bef] text-white py-2.5 px-4 text-sm font-medium transition-colors">
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

  {/* Divider with text */}
  <div className="flex items-center my-8">
    <div className="flex-grow h-px bg-zinc-800"></div>
    <span className="px-3 text-xs text-zinc-500">OR</span>
    <div className="flex-grow h-px bg-zinc-800"></div>
  </div>

  {/* Email sign in option */}
  <button className="w-full flex items-center justify-center rounded-full bg-[#2b44dd] hover:bg-opacity-90 text-white py-2.5 px-4 text-sm font-medium transition-colors">
    Continue with Email
  </button>

  {/* Terms text */}
  <p className="mt-6 text-xs text-zinc-500 text-center">
    By continuing, you agree to our{' '}
    <span className="text-zinc-400 hover:text-white cursor-pointer">
      Terms of Service
    </span>{' '}
    and{' '}
    <span className="text-zinc-400 hover:text-white cursor-pointer">
      Privacy Policy
    </span>
  </p>
</div>