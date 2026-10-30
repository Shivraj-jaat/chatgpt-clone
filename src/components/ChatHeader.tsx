import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  PanelLeft, 
  SquarePen, 
  Settings as SettingsIcon, 
  Check, 
  Zap, 
  Sparkles, 
  Eye, 
  Gauge,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { Model } from '../types';
import { useAuth } from '@/context/AuthContext';

interface ChatHeaderProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  apiConnected: boolean;
  models: Model[];
}

export default function ChatHeader({
  selectedModelId,
  onSelectModel,
  sidebarOpen,
  onToggleSidebar,
  onNewChat,
  onOpenSettings,
  onOpenAuth,
  apiConnected,
  models,
}: ChatHeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentModel = models.find((m) => m.id === selectedModelId) || models[0] || {
    id: selectedModelId,
    name: selectedModelId,
    shortName: selectedModelId,
    badge: 'Model',
    badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    description: '',
    speed: '~500 tps',
    context: '128k',
    isDefault: false,
    supportsVision: false,
    supportsReasoning: false,
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModelIcon = (model: Model) => {
    if (model.supportsReasoning) return <Sparkles className="w-4 h-4 text-purple-400" />;
    if (model.supportsVision) return <Eye className="w-4 h-4 text-amber-400" />;
    if (model.speed.includes('800')) return <Gauge className="w-4 h-4 text-blue-400" />;
    return <Zap className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-2 sm:px-4 bg-[#212121]/95 backdrop-blur border-b border-[#2d2d2d]/60 select-none">
      {/* Left controls: Sidebar toggle + Model Selector */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] transition-colors active:scale-95"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative min-w-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#2f2f2f] transition-colors text-xs sm:text-sm font-semibold text-[#ececec] max-w-[200px] sm:max-w-none"
          >
            <span className="truncate">{currentModel.name}</span>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8e8e8e] flex-shrink-0" />
          </button>

          {/* Dropdown Menu (Responsive: fits 320px+ mobile screens) */}
          {dropdownOpen && (
            <div className="fixed sm:absolute top-14 sm:top-full left-2 sm:left-0 mt-1 w-[calc(100vw-16px)] sm:w-96 rounded-2xl bg-[#282828] border border-[#383838] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[75vh] overflow-y-auto">
              <div className="px-3 py-2 text-[11px] font-semibold text-[#8e8e8e] uppercase tracking-wider flex items-center justify-between">
                <span>Model Selector (Groq LPUs)</span>
                <span className="text-[10px] text-emerald-400 font-mono">{models.length} active</span>
              </div>
              <div className="space-y-1">
                {models.map((model) => {
                  const isSelected = model.id === selectedModelId;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-xl transition-colors flex items-start gap-2.5 sm:gap-3 ${
                        isSelected
                          ? 'bg-[#333333] text-white border border-[#484848]'
                          : 'hover:bg-[#2f2f2f] text-[#ececec]'
                      }`}
                    >
                      <div className="pt-0.5 flex-shrink-0">
                        {getModelIcon(model)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-medium text-xs sm:text-sm truncate">{model.name}</span>
                          <span className={`text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border ${model.badgeColor} flex-shrink-0`}>
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-[#a3a3a3] line-clamp-2 leading-relaxed">
                          {model.description}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[10px] sm:text-[11px] text-[#8e8e8e]">
                          <span>⚡ {model.speed}</span>
                          <span>•</span>
                          <span>Context: {model.context}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right controls: User profile / Login + Groq status + New Chat + Settings */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Groq Live Speed / Status indicator (desktop only) */}
        <div
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#181818] border border-[#333333] text-xs text-[#a3a3a3]"
          title="Powered by Groq LPUs for instant inference"
        >
          <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-mono text-[11px]">{apiConnected ? 'Groq 800+ tps' : 'API Key required'}</span>
        </div>

        {/* User Auth Button / Avatar Dropdown */}
        {user && !user.isAnonymous ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-[#2f2f2f] transition-colors"
              title={user.displayName || user.email || 'User Account'}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-[#424242]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center text-white text-xs font-semibold shadow">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#282828] border border-[#383838] shadow-2xl p-2 z-50 animate-in fade-in duration-150 text-xs">
                <div className="px-3 py-2 border-b border-[#383838] mb-1">
                  <div className="font-medium text-[#ececec] truncate flex items-center gap-1">
                    <span>{user.displayName || 'User'}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  </div>
                  <div className="text-[11px] text-[#8e8e8e] truncate">{user.email}</div>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#ececec] hover:bg-[#333333] transition-colors text-left"
                >
                  <SettingsIcon className="w-4 h-4 text-[#8e8e8e]" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-950/40 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#10a37f] hover:bg-[#0e8e6e] text-white text-xs font-medium transition-colors shadow-sm active:scale-95"
            title="Log In / Sign Up"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sign In</span>
          </button>
        )}

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] transition-colors active:scale-95"
          title="New Chat"
        >
          <SquarePen className="w-5 h-5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] transition-colors active:scale-95"
          title="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
