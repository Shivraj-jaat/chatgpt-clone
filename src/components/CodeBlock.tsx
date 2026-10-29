import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export default function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-[#383838] bg-[#0d0d0d] font-mono text-sm shadow-lg">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e1e] border-b border-[#333333] text-xs text-[#b4b4b4]">
        <span className="font-medium tracking-wide lowercase">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#2f2f2f] text-[#b4b4b4] hover:text-white transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[#ececec] text-[13.5px] leading-relaxed">
        <pre className="!bg-transparent !p-0 !m-0 !border-none">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}

