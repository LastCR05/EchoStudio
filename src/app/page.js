'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Video, Music, Clipboard, ChevronsRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Sidebar from '@/components/ui/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorAnimation } from '@/components/ui/ErrorAnimation';

export default function Home() {
  const [link, setLink] = useState('');
  const [selectedTab, setSelectedTab] = useState('video');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Track loading state per conversion option
  const [downloadingFormats, setDownloadingFormats] = useState({});

  // Set iconColor to match the Convert button (here, white)
  const iconColor = '#2b44dd';

  // Extracted fetching logic
  const fetchVideoData = async (url) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/data', { url });
      setVideoData(response.data);
      toast.success('Video information retrieved successfully!');
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || 'Failed to fetch video data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!link) return;
    fetchVideoData(link);
  };

  const handleConvert = async (format, quality) => {
    setDownloadingFormats((prev) => ({
      ...prev,
      [`${format}-${quality}`]: true,
    }));

    try {
      const response = await axios.post(
        '/api/download',
        { url: link, format, quality },
        { responseType: 'blob' }
      );

      // If response is JSON (error), parse it accordingly
      if (
        response.data.type &&
        response.data.type.includes('application/json')
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          const errorObj = JSON.parse(reader.result);
          toast.error(errorObj.message || 'Download failed');
        };
        reader.readAsText(response.data);
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.setAttribute(
        'download',
        `${videoData.title}.${format.toLowerCase()}`
      );
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download completed!');
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || 'Failed to download';
      toast.error(errorMessage);
      console.error('Download error:', error);
    } finally {
      setDownloadingFormats((prev) => ({
        ...prev,
        [`${format}-${quality}`]: false,
      }));
    }
  };

  return (
    <main className="min-h-screen bg-black  text-white flex relative">
      <div className="flex-1 sm:py-3 sm:pl-[85px] flex flex-col items-center">
        <div className="flex flex-col items-center mt-3 xl:mt-8 mb-3 max-w-[700px] w-full px-5 sm:px-10 xl:mb-24 ">
          <div className="h-14 w-14 mb-3">
            <Image
              src="/icons/heart.svg"
              width={100}
              height={100}
              alt="heart"
            />
          </div>
          <form onSubmit={handleSubmit} className="relative w-full mb-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Link size={18} color={iconColor} />
            </div>
            <Input
              type="text"
              placeholder="paste the link here"
              className="bg-zinc-900 border border-zinc-700 text-white w-full max-md:text-sm pl-10 pr-12 focus:border-white"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 flex items-center pr-3 group"
              disabled={loading}
            >
              <ChevronsRight
                size={23}
                color={iconColor}
                className="transition-colors group-hover:text-white"
              />
            </button>
          </form>

          <div className="flex items-center justify-between w-full xsm:flex-col xsm:items-center xsm:justify-center xsm:space-y-4 ">
            <div className="flex space-x-2 xsm:justify-center">
              <Button
                variant={selectedTab === 'video' ? 'selected' : 'secondary'}
                onClick={() => setSelectedTab('video')}
              >
                <Video size={18} color={iconColor} className="mr-2" />
                Video
              </Button>
              <Button
                variant={selectedTab === 'audio' ? 'selected' : 'secondary'}
                onClick={() => setSelectedTab('audio')}
              >
                <Music size={18} color={iconColor} className="mr-2" />
                Audio
              </Button>
            </div>
            <Button
              variant="secondary"
              className="ml-2"
              onClick={async () => {
                const text = await navigator.clipboard.readText();
                setLink(text);
                fetchVideoData(text);
              }}
            >
              <Clipboard size={18} color={iconColor} className="mr-2" />
              Paste
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center pb-44">
            <Spinner className="text-white" size="large" show={true}>
              Loading...
            </Spinner>
          </div>
        ) : error ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-red-500 text-center pb-44">
              {error}
              <ErrorAnimation size="large" show={true} />
            </div>
          </div>
        ) : (
          videoData && (
            <div className="w-full flex flex-col xl:flex-row gap-6 mt-6 mb-6 justify-center items-center px-5 sm:px-10 py-5">
              <div className="w-full max-w-[550px] xl:max-w-[550px]">
                <Image
                  src={videoData.thumbnail}
                  alt="Video Thumbnail"
                  width={300}
                  height={0}
                  className="w-[550px] h-auto object-cover rounded-md bg-[#1a1a1a]"
                />
              </div>

              <div className="w-full max-w-[550px] xl:max-w-[550px] bg-zinc-900 rounded-md overflow-hidden ">
                {/* Table Header */}
                <div className="px-4 py-2 bg-zinc-800 grid grid-cols-4 flex-col xsm:justify-center  xsm:grid-cols-2 gap-4">
                  {/* Quality column always visible */}
                  <div className="text-sm font-medium text-zinc-400 xsm:flex xsm:justify-center">
                    Quality
                  </div>

                  {/* Hide these two on xsm */}
                  <div className="text-sm font-medium text-zinc-400 xsm:hidden">
                    Format
                  </div>
                  <div className="text-sm font-medium text-zinc-400 xsm:hidden">
                    Codec
                  </div>

                  {/* Action column always visible */}
                  <div className="text-sm font-medium text-zinc-400 xsm:flex xsm:justify-center">
                    Action
                  </div>
                </div>

                {/* ✅ SCROLLABLE CONTENT */}
                <div className="divide-y divide-zinc-800 max-h-[280px] overflow-y-auto custom-scrollbar">
                  {selectedTab === 'video'
                    ? videoData.formats
                        .filter((f) => f.hasVideo)
                        .map((format, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-4 gap-4 px-4 py-3 xsm:grid-cols-2"
                          >
                            <span className="text-sm xsm:flex xsm:justify-center">
                              {format.quality}
                            </span>
                            <span className="text-sm xsm:hidden">
                              {format.format}
                            </span>
                            <span className="text-sm xsm:hidden">
                              {format.codec}
                            </span>
                            <div className="xsm:flex xsm:justify-center">
                              <Button
                                loading={
                                  downloadingFormats[
                                    `${format.format}-${format.quality}`
                                  ] || false
                                }
                                className="bg-[#2b44dd] hover:bg-[#3a53e8] text-sm xsm:text-sm "
                                size="sm"
                                onClick={() =>
                                  handleConvert(format.format, format.quality)
                                }
                              >
                                {downloadingFormats[
                                  `${format.format}-${format.quality}`
                                ]
                                  ? 'Converting'
                                  : 'Convert'}
                              </Button>
                            </div>
                          </div>
                        ))
                    : videoData.formats
                        .filter((f) => !f.hasVideo)
                        .map((format, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-4 gap-4 px-4 py-3 xsm:grid-cols-2"
                          >
                            <span className="text-sm">{format.quality}</span>
                            <span className="text-sm xsm:hidden">
                              {format.format}
                            </span>
                            <span className="text-sm xsm:hidden">
                              {format.codec}
                            </span>
                            <div>
                              <Button
                                loading={
                                  downloadingFormats[
                                    `${format.format}-${format.quality}`
                                  ] || false
                                }
                                className="bg-[#2b44dd] hover:bg-[#3a53e8] text-sm xsm:text-sm"
                                size="sm"
                                onClick={() =>
                                  handleConvert(format.format, format.quality)
                                }
                              >
                                {downloadingFormats[
                                  `${format.format}-${format.quality}`
                                ]
                                  ? 'Converting'
                                  : 'Convert'}
                              </Button>
                            </div>
                          </div>
                        ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* Terms text pinned at the bottom */}
        <div className="mt-auto w-full text-center text-zinc-500 text-sm mb-2">
          by continuing, you agree to{' '}
          <span className="underline">terms and ethics of use</span>
        </div>
      </div>
      <Sidebar />
    </main>
  );
}
