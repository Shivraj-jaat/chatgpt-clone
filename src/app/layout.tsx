import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'ChatGPT (Groq Edition) ⚡',
  description: 'A high-fidelity, pixel-perfect ChatGPT clone powered by ultra-fast Groq LPUs.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#212121',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#212121] text-[#ececec] overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}

