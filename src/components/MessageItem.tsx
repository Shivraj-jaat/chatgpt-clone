import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { 
  Copy, 
  Check, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  ThumbsUp, 
  ThumbsDown, 
  Pencil, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  Zap,
  FileText,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import CodeBlock from './CodeBlock';
import { Message } from '../types';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (newContent: string) => void;
}

export default function MessageItem({
  message,
  isLast,
  isStreaming,
  onRegenerate,
  onEditMessage,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(
    typeof message.content === 'string' ? message.content : ''
  );
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  // Copy text to clipboard
  const handleCopy = async () => {
    try {
      const textToCopy = typeof message.content === 'string' ? message.content : '';
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Text-to-Speech (Read aloud)
  const handleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = typeof message.content === 'string' ? message.content : '';
    const cleanText = textToSpeak.replace(/[#*`_~]/g, ''); // strip markdown markup
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEditMessage) {
      onEditMessage(editText.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className={`group py-4 px-3 sm:py-6 sm:px-6 transition-colors ${
      isUser ? 'bg-transparent' : 'bg-[#212121]/50 border-y border-[#2d2d2d]/30'
    }`}>
      <div className="max-w-3xl mx-auto flex gap-2.5 sm:gap-4 md:gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#3f3f46] to-[#52525b] flex items-center justify-center text-white text-xs font-semibold shadow-md border border-[#52525b]/50">
              U
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white shadow-md shadow-[#10a37f]/20">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row with role & badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#ececec]">
                {isUser ? 'You' : 'ChatGPT'}
              </span>

              {!isUser && message.model && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2f2f2f] text-[#b4b4b4] border border-[#383838]">
                  {message.model}
                </span>
              )}
            </div>

            {/* User Edit Trigger */}
            {isUser && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2f2f2f] text-[#8e8e8e] hover:text-[#ececec] transition-opacity"
                title="Edit message"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Attachments Preview (if any) */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {message.attachments.map((att, idx) => (
                <div key={idx} className="relative group/att rounded-lg overflow-hidden border border-[#383838] bg-[#2f2f2f]">
                  {att.type === 'image' ? (
                    <img
                      src={att.data}
                      alt={att.name || 'Attached image'}
                      className="max-h-48 max-w-xs object-cover rounded-md"
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#ececec]">
                      <FileText className="w-4 h-4 text-[#10a37f]" />
                      <span className="max-w-[150px] truncate">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* DeepSeek R1 / Reasoning chain of thought accordion */}
          {!isUser && (message.reasoning || (isStreaming && isLast && message.isThinking)) && (
            <div className="my-2 rounded-lg border border-[#383838] bg-[#1a1a1a]/80 overflow-hidden">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-[#b4b4b4] hover:bg-[#262626] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span>
                    {isStreaming && isLast && message.isThinking
                      ? 'Thinking deeply...'
                      : 'Thought process'}
                  </span>
                </div>
                {showThinking ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              {showThinking && (
                <div className="px-3.5 py-3 border-t border-[#383838] text-xs font-mono text-[#a1a1aa] bg-[#121212] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {message.reasoning}
                  {isStreaming && isLast && message.isThinking && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-400 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* User message edit mode */}
          {isEditing ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-3 rounded-lg bg-[#2f2f2f] text-[#ececec] border border-[#424242] focus:border-[#10a37f] focus:outline-none resize-none text-sm"
                rows={Math.min(6, Math.max(2, editText.split('\n').length))}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs font-medium bg-[#10a37f] hover:bg-[#0e8e6e] text-white rounded-md transition-colors"
                >
                  Send & Update
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-[#383838] hover:bg-[#424242] text-[#ececec] rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Standard Message Content */
            <div className={`prose prose-invert max-w-none text-[15px] leading-relaxed text-[#ececec] break-words ${
              isStreaming && isLast ? 'streaming-cursor' : ''
            }`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  img({ node, src, alt, ...props }: any) {
                    return (
                      <div className="my-4 rounded-2xl overflow-hidden border border-[#383838] bg-[#1a1a1a] shadow-xl max-w-xl group/img">
                        <div className="relative overflow-hidden bg-[#121212] min-h-[250px] flex items-center justify-center">
                          <img
                            src={src}
                            alt={alt || 'Generated image'}
                            className="w-full h-auto object-cover rounded-t-2xl transition-transform duration-300 group-hover/img:scale-[1.01]"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-3 bg-[#242424] border-t border-[#383838] flex items-center justify-between gap-3 text-xs text-[#b4b4b4]">
                          <span className="truncate font-medium text-[#ececec]">{alt || 'AI Generated Image'}</span>
                          <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#383838] hover:bg-[#484848] text-white font-medium text-xs transition-colors flex-shrink-0"
                          >
                            <Download className="w-3.5 h-3.5 text-[#10a37f]" />
                            <span>Download / Full Size</span>
                          </a>
                        </div>
                      </div>
                    );
                  },
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    if (!inline && match) {
                      return (
                        <CodeBlock
                          language={match[1]}
                          value={codeString}
                        />
                      );
                    } else if (!inline && codeString.includes('\n')) {
                      return (
                        <CodeBlock
                          language="text"
                          value={codeString}
                        />
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {typeof message.content === 'string' ? message.content : ''}
              </ReactMarkdown>
            </div>
          )}

          {/* Assistant Stats Footer & Action Bar */}
          {!isUser && !isStreaming && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8e8e8e]">
              {/* Performance Metrics Badge */}
              {message.stats && (
                <div className="flex items-center gap-2 text-[11px] px-2 py-0.5 rounded bg-[#2a2a2a] border border-[#383838]/60 text-[#a3a3a3]">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                  <span>{message.stats.tps} tokens/s</span>
                  <span className="opacity-40">•</span>
                  <span>{message.stats.duration}s</span>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-400 font-medium">Groq LPU</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-[#2f2f2f] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
                  title="Copy message"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                {/* Read aloud button */}
                <button
                  onClick={handleSpeech}
                  className="p-1.5 rounded hover:bg-[#2f2f2f] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
                  title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                {/* Regenerate button */}
                {isLast && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded hover:bg-[#2f2f2f] text-[#8e8e8e] hover:text-[#ececec] transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {/* Thumbs up / down feedback */}
                <button
                  onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
                  className={`p-1.5 rounded hover:bg-[#2f2f2f] transition-colors ${
                    feedback === 'like' ? 'text-emerald-400' : 'text-[#8e8e8e] hover:text-[#ececec]'
                  }`}
                  title="Good response"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
                  className={`p-1.5 rounded hover:bg-[#2f2f2f] transition-colors ${
                    feedback === 'dislike' ? 'text-red-400' : 'text-[#8e8e8e] hover:text-[#ececec]'
                  }`}
                  title="Bad response"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

