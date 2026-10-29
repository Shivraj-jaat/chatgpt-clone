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
  Image as ImageIcon 
} from 'lucide-react';
import { Attachment } from '../types';

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
  const [useWebSearch, setUseWebSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
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

  // Handle file uploads (Images & Documents)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const isImg = file.type.startsWith('image/');

      if (isImg) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            {
              type: 'image',
              name: file.name,
              data: reader.result as string,
              mimeType: file.type,
            },
          ]);
        };
        reader.readAsDataURL(file);
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
            },
          ]);
        };
        reader.readAsText(file);
      }
    });

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
              headers: apiKey ? { 'x-groq-api-key': apiKey } : {},
              body: formData,
            });
            const data = await res.json();
            if (data.text) {
              setText((prev) => (prev ? `${prev} ${data.text}` : data.text));
            }
          } catch (err) {
            console.error('Whisper transcription failed:', err);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err: any) {
        console.error('Microphone access denied:', err);
        alert('Could not access microphone: ' + err.message);
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 md:pb-6">
      {/* Floating capsule container */}
      <div className="relative rounded-[26px] bg-[#2f2f2f] border border-[#383838] shadow-2xl transition-all focus-within:border-[#52525b] focus-within:ring-1 focus-within:ring-[#52525b]">
        
        {/* Attachments preview list inside the pill */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3.5 pb-1">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#212121] border border-[#424242] text-xs text-[#ececec] group/pill"
              >
                {att.type === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="max-w-[130px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 rounded-full hover:bg-[#383838] text-[#8e8e8e] hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input area */}
        <div className="flex items-end px-3.5 py-2.5">
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
            className="p-2 mb-0.5 rounded-full text-[#b4b4b4] hover:text-white hover:bg-[#383838] transition-colors flex-shrink-0"
            title="Attach images or documents"
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
            className="flex-1 max-h-[200px] py-1.5 px-3 bg-transparent text-[#ececec] placeholder-[#8e8e8e] text-[15px] resize-none focus:outline-none leading-relaxed"
          />

          {/* Action buttons (Web search, Mic, Send) */}
          <div className="flex items-center gap-1.5 mb-0.5 flex-shrink-0">
            {/* Web Search toggle */}
            <button
              type="button"
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={`p-2 rounded-full transition-colors ${
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
              className={`p-2 rounded-full transition-colors ${
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
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:opacity-90 transition-all shadow-md"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-black" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() && attachments.length === 0}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
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
      <div className="text-center mt-2.5 text-[11px] text-[#8e8e8e] select-none">
        ChatGPT can make mistakes. Verify important info. Powered by Groq LPUs.
      </div>
    </div>
  );
}

