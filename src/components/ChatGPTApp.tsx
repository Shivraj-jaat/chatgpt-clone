'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import SettingsModal from './SettingsModal';
import { MODELS, DEFAULT_SYSTEM_PROMPT } from '../constants';
import { Chat, Message, Attachment, Model } from '../types';
import { ArrowDown } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  loadChatsFromFirestore,
  saveChatToFirestore,
  deleteChatFromFirestore,
  clearAllChatsFromFirestore,
} from '../lib/firestore';

export default function ChatGPTApp() {
  // Local storage keys
  const STORAGE_KEY_CHATS = 'chatgpt_groq_chats_v1';
  const STORAGE_KEY_API_KEY = 'chatgpt_groq_api_key';
  const STORAGE_KEY_SETTINGS = 'chatgpt_groq_settings';

  // Saved settings
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Dynamic models from Groq account
  const [availableModels, setAvailableModels] = useState<Model[]>(MODELS);
  const [selectedModelId, setSelectedModelId] = useState<string>(MODELS[0].id);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // References
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load from localStorage on mount (prevents SSR hydration mismatch)
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
      setApiKey(savedKey);

      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.systemPrompt) setSystemPrompt(parsed.systemPrompt);
        if (parsed.temperature !== undefined) setTemperature(parsed.temperature);
        if (parsed.maxTokens !== undefined) setMaxTokens(parsed.maxTokens);
      }

      // First check localStorage for immediate render
      const savedChats = localStorage.getItem(STORAGE_KEY_CHATS);
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        if (Array.isArray(parsedChats) && parsedChats.length > 0) {
          setChats(parsedChats);
          setActiveChatId(parsedChats[0].id);
        }
      }

      // Then load from Firestore if configured
      if (isFirebaseConfigured) {
        loadChatsFromFirestore()
          .then((firestoreChats) => {
            if (firestoreChats && firestoreChats.length > 0) {
              setChats(firestoreChats);
              setActiveChatId((prev) => {
                const stillExists = firestoreChats.some((c) => c.id === prev);
                return stillExists ? prev : firestoreChats[0].id;
              });
            }
          })
          .catch((err) => console.warn('Could not load chats from Firestore:', err));
      }
    } catch (e) {
      console.error('Error loading data from storage:', e);
    }
    setIsClientLoaded(true);
  }, []);

  // Fetch live available models for this Groq account / key
  useEffect(() => {
    fetch('/api/models', {
      headers: apiKey ? { 'x-groq-api-key': apiKey } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          setAvailableModels(data.models);
          setSelectedModelId((prev) => {
            const exists = data.models.some((m: Model) => m.id === prev);
            return exists ? prev : data.models[0].id;
          });
        }
      })
      .catch((err) => console.warn('Could not load dynamic models:', err));
  }, [apiKey]);

  // Persist chats to localStorage
  useEffect(() => {
    if (!isClientLoaded) return;
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
  }, [chats, isClientLoaded]);

  // Persist settings
  useEffect(() => {
    if (!isClientLoaded) return;
    localStorage.setItem(
      STORAGE_KEY_SETTINGS,
      JSON.stringify({ systemPrompt, temperature, maxTokens })
    );
  }, [systemPrompt, temperature, maxTokens, isClientLoaded]);

  // Persist API key
  useEffect(() => {
    if (!isClientLoaded) return;
    if (apiKey) {
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
  }, [apiKey, isClientLoaded]);

  // Check backend & Groq API connection on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setApiConnected(Boolean(data.hasEnvKey || apiKey));
      })
      .catch(() => setApiConnected(false));
  }, [apiKey]);

  // Current active chat object
  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const currentMessages = activeChat ? activeChat.messages : [];

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // Detect user scroll position
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  // Create a new chat
  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const newChat: Chat = {
      id: 'chat_' + Date.now(),
      title: 'New chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: selectedModelId,
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    saveChatToFirestore(newChat);
  };

  // Delete a chat
  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      const remaining = chats.filter((c) => c.id !== chatId);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
    }
    deleteChatFromFirestore(chatId);
  };

  // Rename a chat
  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updated = { ...c, title: newTitle, updatedAt: new Date().toISOString() };
          saveChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
  };

  // Toggle Pin chat
  const handleTogglePin = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === chatId) {
          const updated = { ...c, pinned: !c.pinned };
          saveChatToFirestore(updated);
          return updated;
        }
        return c;
      })
    );
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Send message and stream response from Groq
  const handleSendMessage = async ({
    content,
    attachments = [],
  }: {
    content: string;
    attachments?: Attachment[];
    useWebSearch?: boolean;
  }) => {
    if (!content.trim() && attachments.length === 0) return;

    let targetChatId = activeChatId;
    let currentChat = activeChat;

    // Create chat if none active
    if (!currentChat) {
      const newChat: Chat = {
        id: 'chat_' + Date.now(),
        title: content.slice(0, 32) || 'New chat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: selectedModelId,
        messages: [],
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      targetChatId = newChat.id;
      currentChat = newChat;
    }

    const currentModelObj = availableModels.find((m) => m.id === selectedModelId);

    const userMessage: Message = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content,
      attachments,
      createdAt: new Date().toISOString(),
    };

    const assistantPlaceholder: Message = {
      id: 'msg_bot_' + Date.now(),
      role: 'assistant',
      content: '',
      reasoning: '',
      isThinking: Boolean(currentModelObj?.supportsReasoning),
      model: currentModelObj?.name || selectedModelId,
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...currentChat.messages, userMessage, assistantPlaceholder];

    // Auto title if first user message
    const isFirstMessage = currentChat.messages.length === 0;
    const newTitle = isFirstMessage
      ? content.slice(0, 36) + (content.length > 36 ? '...' : '')
      : currentChat.title;

    const updatedChatObj: Chat = {
      ...currentChat,
      title: newTitle,
      updatedAt: new Date().toISOString(),
      messages: updatedMessages,
    };

    setChats((prev) =>
      prev.map((c) => (c.id === targetChatId ? updatedChatObj : c))
    );
    saveChatToFirestore(updatedChatObj);

    setIsStreaming(true);
    setTimeout(() => scrollToBottom('smooth'), 50);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Prepare API messages history
    const apiMessages = [
      ...currentChat.messages.map((m) => {
        // Format images if multimodal
        if (m.attachments && m.attachments.some((a) => a.type === 'image')) {
          const contentParts: any[] = [{ type: 'text', text: m.content }];
          m.attachments.forEach((a) => {
            if (a.type === 'image') {
              contentParts.push({
                type: 'image_url',
                image_url: { url: a.data },
              });
            }
          });
          return { role: m.role, content: contentParts };
        }
        return { role: m.role, content: m.content };
      }),
      // Add current message
      attachments.some((a) => a.type === 'image')
        ? {
            role: 'user',
            content: [
              { type: 'text', text: content },
              ...attachments
                .filter((a) => a.type === 'image')
                .map((a) => ({ type: 'image_url', image_url: { url: a.data } })),
            ],
          }
        : { role: 'user', content },
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-groq-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModelId,
          temperature,
          max_tokens: maxTokens,
          systemPrompt,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser or empty response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let accumulatedReasoning = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.replace('data: ', '').trim();
          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              // Don't show raw API errors to user — set a clean message
              accumulatedContent = "I'm sorry, I encountered an issue processing your request. Please try again.";
            }

            if (data.reasoning) {
              accumulatedReasoning += data.reasoning;
            }

            if (data.token) {
              accumulatedContent += data.token;
            }

            // Update in-place in active chat
            setChats((prev) =>
              prev.map((c) => {
                if (c.id !== targetChatId) return c;
                const msgs = [...c.messages];
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  msgs[msgs.length - 1] = {
                    ...lastMsg,
                    content: accumulatedContent,
                    reasoning: accumulatedReasoning,
                    isThinking: Boolean(accumulatedReasoning && !accumulatedContent),
                    stats: data.done ? data.stats : lastMsg.stats,
                  };
                }
                return { ...c, messages: msgs };
              })
            );

            // Auto-scroll while streaming
            if (chatContainerRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
              if (scrollHeight - scrollTop - clientHeight < 200) {
                chatContainerRef.current.scrollTop = scrollHeight;
              }
            }
          } catch (e) {
            console.error('Failed to parse SSE JSON line:', jsonStr, e);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Streaming error:', err);
        // Determine a user-friendly message
        const isModelError =
          err.message?.includes('does not exist') ||
          err.message?.includes('model_not_found') ||
          err.message?.includes('rate_limit') ||
          err.message?.includes('too large') ||
          err.message?.includes('413') ||
          err.message?.includes('404');

        const friendlyMsg = isModelError
          ? "There was a temporary issue connecting to the AI model. Please try sending your message again."
          : "Something went wrong. Please try again.";

        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== targetChatId) return c;
            const msgs = [...c.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              msgs[msgs.length - 1] = {
                ...lastMsg,
                content: friendlyMsg,
              };
            }
            return { ...c, messages: msgs };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      // Persist the finalized conversation to Firestore
      setChats((current) => {
        const completed = current.find((c) => c.id === targetChatId);
        if (completed) {
          saveChatToFirestore(completed);
        }
        return current;
      });
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = () => {
    if (!activeChat || activeChat.messages.length < 2 || isStreaming) return;

    const msgs = [...activeChat.messages];
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserMessage = msgs[lastUserIndex];
    // Trim conversation up to that user message
    const trimmedMessages = msgs.slice(0, lastUserIndex);

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, messages: trimmedMessages } : c
      )
    );

    // Re-send user message
    handleSendMessage({
      content: lastUserMessage.content,
      attachments: lastUserMessage.attachments || [],
    });
  };

  // Edit user message and fork/regenerate from that point
  const handleEditMessage = (msgIndex: number, newContent: string) => {
    if (!activeChat || isStreaming) return;

    const truncated = activeChat.messages.slice(0, msgIndex);
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, messages: truncated } : c
      )
    );

    handleSendMessage({
      content: newContent,
      attachments: activeChat.messages[msgIndex]?.attachments || [],
    });
  };

  // Export chats
  const handleExportChats = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(chats, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `chatgpt_groq_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Clear all chats
  const handleClearAllChats = () => {
    clearAllChatsFromFirestore(chats);
    setChats([]);
    setActiveChatId(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#212121] text-[#ececec]">
      
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          if (isStreaming) handleStopStreaming();
          setActiveChatId(id);
        }}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onTogglePin={handleTogglePin}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Chat Viewport */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Top Header */}
        <ChatHeader
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={handleNewChat}
          onOpenSettings={() => setSettingsOpen(true)}
          apiConnected={apiConnected}
          models={availableModels}
        />

        {/* Scrollable Chat Area */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto flex flex-col"
        >
          {currentMessages.length === 0 ? (
            <EmptyState
              onSelectSuggestion={(prompt) => handleSendMessage({ content: prompt })}
              modelName={availableModels.find((m) => m.id === selectedModelId)?.name}
            />
          ) : (
            <div className="pb-6 divide-y divide-[#2d2d2d]/30">
              {currentMessages.map((msg, idx) => (
                <MessageItem
                  key={msg.id || idx}
                  message={msg}
                  isLast={idx === currentMessages.length - 1}
                  isStreaming={isStreaming}
                  onRegenerate={handleRegenerate}
                  onEditMessage={(newText) => handleEditMessage(idx, newText)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-28 right-8 p-2 rounded-full bg-[#2f2f2f] border border-[#424242] shadow-xl text-[#ececec] hover:bg-[#383838] transition-all hover:scale-110 z-20"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          selectedModel={selectedModelId}
          apiKey={apiKey}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={setApiKey}
        systemPrompt={systemPrompt}
        onSaveSystemPrompt={setSystemPrompt}
        temperature={temperature}
        onSaveTemperature={setTemperature}
        maxTokens={maxTokens}
        onSaveMaxTokens={setMaxTokens}
        onClearAllChats={handleClearAllChats}
        onExportChats={handleExportChats}
        isFirebaseConfigured={isFirebaseConfigured}
      />
    </div>
  );
}
