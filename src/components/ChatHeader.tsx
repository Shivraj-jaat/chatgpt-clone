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
  Gauge 
} from 'lucide-react';
import { Model } from '../types';

interface ChatHeaderProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
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
  apiConnected,
  models,
}: ChatHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
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
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-3 md:px-4 bg-[#212121]/95 backdrop-blur border-b border-[#2d2d2d]/60 select-none">
      {/* Left controls: Sidebar toggle + Model Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-[#2f2f2f] transition-colors text-sm font-semibold text-[#ececec]"
          >
            <span>{currentModel.name}</span>
            <ChevronDown className="w-4 h-4 text-[#8e8e8e]" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#282828] border border-[#383838] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[75vh] overflow-y-auto">
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
                      className={`w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3 ${
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
                          <span className="font-medium text-sm truncate">{model.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${model.badgeColor}`}>
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#a3a3a3] line-clamp-2 leading-relaxed">
                          {model.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8e8e8e]">
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

      {/* Right controls: New Chat + Settings + Groq status */}
      <div className="flex items-center gap-2">
        {/* Groq Live Speed / Status indicator */}
        <div
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#181818] border border-[#333333] text-xs text-[#a3a3a3]"
          title="Powered by Groq LPUs for instant inference"
        >
          <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-mono text-[11px]">{apiConnected ? 'Groq 800+ tps' : 'API Key required'}</span>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title="New Chat"
        >
          <SquarePen className="w-5 h-5" />
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
