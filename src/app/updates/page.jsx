'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Sidebar from '@/components/ui/Sidebar';
import { Clipboard, Link } from 'lucide-react';
import Image from 'next/image';

const Updates = () => {
  const [selectedTab, setSelectedTab] = useState('');
  const iconColor = '#2b44dd';

  // Handlers for drag and drop functionality
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    console.log('Dropped files:', files);
    // Here you could add logic to handle the files further.
  };

  return (
    <main className="min-h-screen bg-black text-white flex">
      {/* Main Content */}
      <div className="flex-1 pb-3 pt-3 pl-[85px] flex flex-col items-center">
        {/* Top Bar with Logo and Services */}
        <div className="flex justify-center items-center mb-12">
          <Button variant="ghost" className="text-white hover:bg-zinc-800">
            + supported services
          </Button>
        </div>

        <div className="flex flex-col items-center mb-12 max-w-[500px] w-full">
          {/* Logo */}
          <div className="h-8 w-8 mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full text-white">
              <path
                fill="currentColor"
                d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 80c-16.6 0-30-13.4-30-30s13.4-30 30-30 30 13.4 30 30-13.4 30-30 30z"
              />
            </svg>
          </div>

          {/* Input and Paste Button Row */}
          <div className="flex w-full items-center mb-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Link size={18} color="#a1a1aa" />
              </div>
              <Input
                type="text"
                placeholder="paste the link here"
                className="bg-zinc-900 border-zinc-700 text-white w-full pl-10"
              />
            </div>
            <Button
              variant="secondary"
              className="flex items-center justify-center transition-all duration-150 active:scale-95 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white ml-2"
            >
              <Clipboard size={18} color={iconColor} className="mr-2" />
              Paste
            </Button>
          </div>

          {/* "or" Text */}
          <div className="mb-4 text-center text-zinc-400">or</div>

          {/* Drag and Drop Area */}
          <div
            className="w-[900px] h-[170px] flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-md transition-transform duration-200 hover:scale-105"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col justify-center items-center ">
              <span className="text-zinc-100 font-bold">
                drag and drop a song here
              </span>
              <span className="text-zinc-700 ">MP3, WAV, MP4, FLAC....</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-zinc-500 text-sm mt-8">
          by continuing, you agree to{' '}
          <span className="underline">terms and ethics of use</span>
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar />
    </main>
  );
};

export default Updates;
