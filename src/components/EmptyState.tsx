import React from 'react';
import { Code, Sparkles, Terminal, PenTool, Lightbulb, Zap } from 'lucide-react';
import { PROMPT_SUGGESTIONS } from '../constants';

interface EmptyStateProps {
  onSelectSuggestion: (prompt: string) => void;
  modelName?: string;
}

export default function EmptyState({ onSelectSuggestion, modelName }: EmptyStateProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'code':
        return <Code className="w-5 h-5 text-emerald-400" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'terminal':
        return <Terminal className="w-5 h-5 text-blue-400" />;
      case 'pen-tool':
        return <PenTool className="w-5 h-5 text-amber-400" />;
      default:
        return <Lightbulb className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-3xl mx-auto my-auto w-full text-center select-none py-10">
      
      {/* Central ChatGPT Avatar / Logo */}
      <div className="w-14 h-14 rounded-full bg-[#10a37f] flex items-center justify-center text-white shadow-xl shadow-[#10a37f]/20 mb-5 animate-in zoom-in-95 duration-200">
        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
          <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
        </svg>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-[#ececec] mb-2 tracking-tight">
        What can I help with today?
      </h1>
      
      <p className="text-xs sm:text-sm text-[#8e8e8e] max-w-md mb-8 flex items-center justify-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
        <span>Powered by Groq LPUs for lightning-fast real-time inference {modelName ? `(${modelName})` : ''}</span>
      </p>

      {/* Grid of Prompt Starter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {PROMPT_SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectSuggestion(item.prompt)}
            className="group p-4 rounded-2xl bg-[#282828]/70 hover:bg-[#2f2f2f] border border-[#383838] hover:border-[#4d4d4d] transition-all flex flex-col justify-between gap-3 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-sm text-[#ececec] group-hover:text-white transition-colors">
                {item.title}
              </span>
              <div className="p-1.5 rounded-lg bg-[#212121] group-hover:bg-[#383838] transition-colors">
                {getIcon(item.icon)}
              </div>
            </div>
            <p className="text-xs text-[#8e8e8e] group-hover:text-[#b4b4b4] line-clamp-2 transition-colors">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

