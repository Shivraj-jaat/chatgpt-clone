'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import ChatGPTApp from '@/components/ChatGPTApp';

export default function Home() {
  return (
    <AuthProvider>
      <ChatGPTApp />
    </AuthProvider>
  );
}
