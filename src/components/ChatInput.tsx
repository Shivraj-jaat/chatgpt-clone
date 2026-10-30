import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Square, 
  Plus, 
  Mic, 
  MicOff, 
  Globe, 
  X, 
  FileText, 
  Image as ImageIcon,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Attachment } from '../types';
import { compressImage, formatBytes } from '@/lib/imageCompression';

interface ChatInputProps {
  onSendMessage: (payload: { content: string; attachments: Attachment[]; useWebSearch?: boolean }) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  selectedModel: string;
  apiKey: string;
}

export default function ChatInput({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  apiKey,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    if (!text.trim() && attachments.length === 0) return;

    let finalPrompt = text.trim();
    if (useWebSearch) {
      finalPrompt = `[Web Search Requested] ${finalPrompt}`;
    }

    onSendMessage({
      content: finalPrompt,
      attachments: [...attachments],
      useWebSearch
    });

    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle file uploads (Images with Auto-Compression & Documents)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      const isImg = file.type.startsWith('image/');

      if (isImg) {
        setIsCompressing(true);
        try {
          // Compress & downsample image to max 800px & 0.75 quality for minimum token usage
          const compressed = await compressImage(file, 800, 0.75);
          setAttachments((prev) => [
            ...prev,
            {
              type: 'image',
              name: compressed.name,
              data: compressed.data,
              mimeType: compressed.mimeType,
              size: compressed.size,
              originalSize: compressed.originalSize,
              compressed: true,
            },
          ]);
        } catch (err) {
          console.warn('Image compression failed, using fallback reader:', err);
          const reader = new FileReader();
          reader.onload = () => {
            setAttachments((prev) => [
              ...prev,
              {
                type: 'image',
                name: file.name,
                data: reader.result as string,
                mimeType: file.type,
                size: file.size,
              },
            ]);
          };
          reader.readAsDataURL(file);
        } finally {
          setIsCompressing(false);
        }
      } else {
        // Read text / code file
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            {
              type: 'file',
              name: file.name,
              data: reader.result as string,
              mimeType: file.type || 'text/plain',
              size: file.size,
            },
          ]);
        };
        reader.readAsText(file);
      }
    }

    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Audio recording & Groq Whisper transcription
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const tracks = stream.getTracks();
          tracks.forEach(track => track.stop());

          // Send to backend Groq Whisper endpoint
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          if (apiKey) formData.append('apiKey', apiKey);

          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.text) {
              setText((prev) => (prev ? `${prev} ${data.text}` : data.text));
            } else if (data.error) {
              console.error('Whisper transcription error:', data.error);
            }
          } catch (error) {
            console.error('Failed to transcribe audio:', error);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone access denied:', err);
        alert('Microphone access was denied. Please allow microphone permissions in your browser.');
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 pb-3 sm:pb-4 pt-1">
      {/* Floating capsule card */}
      <div className="relative rounded-2xl md:rounded-3xl bg-[#2f2f2f] border border-[#3e3e3e] shadow-2xl focus-within:border-[#525252] transition-all">
        
        {/* Compressing indicator */}
        {isCompressing && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-emerald-400 bg-[#252525] rounded-t-2xl border-b border-[#383838]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Compressing image to save AI tokens...</span>
          </div>
        )}

        {/* Attachment preview pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 sm:px-4 pt-3 pb-1">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#212121] border border-[#424242] text-xs text-[#ececec] group/pill max-w-full"
              >
                {att.type === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                )}
                
                <span className="max-w-[120px] sm:max-w-[160px] truncate">{att.name}</span>
                
                {att.size && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2a2a2a] text-emerald-400 font-mono flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {formatBytes(att.size)}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 rounded-full hover:bg-[#383838] text-[#8e8e8e] hover:text-white transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input area */}
        <div className="flex items-end px-2 sm:px-3.5 py-2 sm:py-2.5 gap-1">
          {/* File attachment button (+) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
            accept="image/*,.txt,.py,.js,.jsx,.ts,.tsx,.json,.csv,.md,.html,.css"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 mb-0.5 rounded-full text-[#b4b4b4] hover:text-white hover:bg-[#383838] transition-colors flex-shrink-0 active:scale-95"
            title="Attach images (Auto-compressed for minimum tokens) or documents"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? 'Listening with Groq Whisper... Click mic to stop.'
                : 'Message ChatGPT...'
            }
            rows={1}
            className="flex-1 max-h-[160px] sm:max-h-[200px] py-1.5 px-2 bg-transparent text-[#ececec] placeholder-[#8e8e8e] text-sm sm:text-[15px] resize-none focus:outline-none leading-relaxed"
          />

          {/* Action buttons (Web search, Mic, Send) */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 flex-shrink-0">
            {/* Web Search toggle */}
            <button
              type="button"
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={`p-2 rounded-full transition-colors active:scale-95 ${
                useWebSearch
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-[#8e8e8e] hover:text-white hover:bg-[#383838]'
              }`}
              title={useWebSearch ? 'Web Search active' : 'Toggle Web Search'}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Whisper Voice Input */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-full transition-colors active:scale-95 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-[#8e8e8e] hover:text-white hover:bg-[#383838]'
              }`}
              title={isRecording ? 'Stop recording' : 'Voice input (Groq Whisper)'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send / Stop Streaming button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-md"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-black" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() && attachments.length === 0}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                  text.trim() || attachments.length > 0
                    ? 'bg-white text-black hover:opacity-90'
                    : 'bg-[#424242] text-[#8e8e8e] cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer disclaimer matching OpenAI ChatGPT */}
      <div className="text-center mt-2 text-[10px] sm:text-[11px] text-[#8e8e8e] select-none px-2 truncate">
        ChatGPT can make mistakes. Verify important info. Powered by Groq LPUs.
      </div>
    </div>
  );
}
