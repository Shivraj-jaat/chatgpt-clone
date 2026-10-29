import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'ChatGPT (Groq Edition) ⚡',
  description: 'A high-fidelity, pixel-perfect ChatGPT clone powered by ultra-fast Groq LPUs.',
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

