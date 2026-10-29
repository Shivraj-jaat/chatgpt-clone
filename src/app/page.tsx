'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ChatGPTApp = dynamic(() => import('@/components/ChatGPTApp'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#212121] text-[#ececec]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#10a37f] flex items-center justify-center text-white animate-pulse">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
          </svg>
        </div>
        <span className="text-sm text-[#8e8e8e]">Loading ChatGPT...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  return <ChatGPTApp />;
}

