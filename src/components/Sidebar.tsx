import React, { useState, useMemo } from 'react';
import { 
  SquarePen, 
  Search, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Pin, 
  Settings, 
  MessageSquare
} from 'lucide-react';
import { Chat } from '../types';

interface SidebarProps {
  isOpen: boolean;
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  isOpen,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  onOpenSettings,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Group chats by date
  const groupedChats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;
    const thirtyDaysAgo = today - 30 * 86400000;

    const filtered = chats.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinned = filtered.filter((c) => c.pinned);
    const unpinned = filtered.filter((c) => !c.pinned);

    const groups: Record<string, Chat[]> = {
      Pinned: pinned,
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      Older: [],
    };

    unpinned.forEach((chat) => {
      const chatTime = new Date(chat.createdAt || chat.updatedAt || Date.now()).getTime();
      if (chatTime >= today) {
        groups.Today.push(chat);
      } else if (chatTime >= yesterday) {
        groups.Yesterday.push(chat);
      } else if (chatTime >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(chat);
      } else if (chatTime >= thirtyDaysAgo) {
        groups['Previous 30 Days'].push(chat);
      } else {
        groups.Older.push(chat);
      }
    });

    return groups;
  }, [chats, searchQuery]);

  const handleStartRename = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = (chatId: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col h-full bg-[#171717] border-r border-[#282828] select-none text-sm z-30 transition-all duration-200">
      
      {/* Top Header & New Chat */}
      <div className="p-3 space-y-2 border-b border-[#282828]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-[#ececec] border border-[#333333] transition-colors shadow-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#10a37f] flex items-center justify-center text-white">
              <span className="text-xs font-bold">+</span>
            </div>
            <span>New chat</span>
          </div>
          <SquarePen className="w-4 h-4 text-[#8e8e8e]" />
        </button>

        {/* Search Chats Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8e8e8e]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#212121] text-xs text-[#ececec] placeholder-[#8e8e8e] border border-[#333333] focus:border-[#4f4f4f] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-[#8e8e8e] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {Object.entries(groupedChats).map(([groupTitle, chatList]) => {
          if (!chatList || chatList.length === 0) return null;

          return (
            <div key={groupTitle} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider">
                {groupTitle}
              </div>

              {chatList.map((chat) => {
                const isActive = chat.id === activeChatId;
                const isEditing = chat.id === editingChatId;

                return (
                  <div
                    key={chat.id}
                    onClick={() => !isEditing && onSelectChat(chat.id)}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#212121] text-white font-medium border border-[#333333]'
                        : 'text-[#b4b4b4] hover:bg-[#212121]/60 hover:text-[#ececec]'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(chat.id, e);
                            if (e.key === 'Escape') setEditingChatId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-[#171717] px-2 py-0.5 text-xs text-white border border-[#10a37f] rounded focus:outline-none"
                        />
                        <button
                          onClick={(e) => handleSaveRename(chat.id, e)}
                          className="p-1 text-emerald-400 hover:text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(null);
                          }}
                          className="p-1 text-[#8e8e8e] hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                          {chat.pinned ? (
                            <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                          )}
                          <span className="truncate text-xs">{chat.title}</span>
                        </div>

                        {/* Hover Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(chat.id);
                            }}
                            className={`p-1 rounded hover:bg-[#2f2f2f] transition-colors ${
                              chat.pinned ? 'text-amber-400' : 'text-[#8e8e8e] hover:text-white'
                            }`}
                            title={chat.pinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleStartRename(chat, e)}
                            className="p-1 rounded hover:bg-[#2f2f2f] text-[#8e8e8e] hover:text-white transition-colors"
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="p-1 rounded hover:bg-[#2f2f2f] text-[#8e8e8e] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {chats.length === 0 && (
          <div className="text-center py-8 px-4 text-xs text-[#8e8e8e]">
            No conversations yet. Start a new chat!
          </div>
        )}
      </div>

      {/* Bottom Profile & Settings Section */}
      <div className="p-2 border-t border-[#282828] space-y-1">
        {/* User Profile Pill */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#212121] transition-colors cursor-pointer text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center text-white font-semibold text-xs shadow">
              U
            </div>
            <div>
              <div className="font-medium text-[#ececec]">Groq Pro User</div>
              <div className="text-[10px] text-emerald-400">Groq LPUs Connected</div>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:bg-[#2f2f2f] text-[#8e8e8e] hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

