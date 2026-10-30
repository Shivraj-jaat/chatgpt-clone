import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Sliders, 
  MessageSquare, 
  Trash2, 
  Download, 
  ExternalLink, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Database
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  temperature: number;
  onSaveTemperature: (temp: number) => void;
  maxTokens: number;
  onSaveMaxTokens: (tokens: number) => void;
  onClearAllChats: () => void;
  onExportChats: () => void;
  isFirebaseConfigured?: boolean;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  systemPrompt,
  onSaveSystemPrompt,
  temperature,
  onSaveTemperature,
  maxTokens,
  onSaveMaxTokens,
  onClearAllChats,
  onExportChats,
  isFirebaseConfigured = false,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'model' | 'data'>('general');
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [tempTemperature, setTempTemperature] = useState(temperature);
  const [tempMaxTokens, setTempMaxTokens] = useState(maxTokens);
  const [testStatus, setTestStatus] = useState<'testing' | 'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveAll = () => {
    onSaveApiKey(keyInput.trim());
    onSaveSystemPrompt(tempSystemPrompt);
    onSaveTemperature(tempTemperature);
    onSaveMaxTokens(tempMaxTokens);
    onClose();
  };

  const handleTestKey = async () => {
    const keyToTest = keyInput.trim() || apiKey;
    setTestStatus('testing');
    setTestMessage('Verifying with Groq API...');

    try {
      const res = await fetch('/api/models', {
        headers: keyToTest ? { 'x-groq-api-key': keyToTest } : {},
      });
      if (res.ok) {
        setTestStatus('success');
        setTestMessage('Groq API Key verified successfully! Blazing fast LPUs active.');
      } else {
        const data = await res.json();
        setTestStatus('error');
        setTestMessage(data.error || 'Invalid API Key');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage('Failed to reach backend: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[#212121] border border-[#383838] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#2f2f2f]">
          <h2 className="text-base sm:text-lg font-semibold text-[#ececec]">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e8e8e] hover:text-white hover:bg-[#2f2f2f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2f2f2f] px-3 sm:px-6 text-xs sm:text-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 sm:py-3 px-2.5 sm:px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
              activeTab === 'general'
                ? 'border-[#10a37f] text-[#ececec]'
                : 'border-transparent text-[#8e8e8e] hover:text-[#ececec]'
            }`}
          >
            <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Groq API Key</span>
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`py-2.5 sm:py-3 px-2.5 sm:px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
              activeTab === 'model'
                ? 'border-[#10a37f] text-[#ececec]'
                : 'border-transparent text-[#8e8e8e] hover:text-[#ececec]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Model & Prompt</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-2.5 sm:py-3 px-2.5 sm:px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
              activeTab === 'data'
                ? 'border-[#10a37f] text-[#ececec]'
                : 'border-transparent text-[#8e8e8e] hover:text-[#ececec]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Data Controls</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* GENERAL / API KEY TAB */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#ececec] mb-1.5">
                  Groq API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#2f2f2f] text-sm text-[#ececec] placeholder-[#8e8e8e] border border-[#424242] focus:border-[#10a37f] focus:outline-none pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-[#8e8e8e] hover:text-[#ececec]"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Get a free API key at console.groq.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={handleTestKey}
                    className="px-2.5 py-1 rounded bg-[#383838] hover:bg-[#484848] text-[#ececec] transition-colors"
                  >
                    Test Key
                  </button>
                </div>

                {/* Verification result feedback */}
                {testStatus && (
                  <div
                    className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testStatus === 'success'
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                        : testStatus === 'error'
                        ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                        : 'bg-[#2a2a2a] text-[#a3a3a3]'
                    }`}
                  >
                    {testStatus === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
                    {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    <span>{testMessage}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#282828] border border-[#383838] text-xs text-[#a3a3a3] leading-relaxed">
                <span className="font-semibold text-[#ececec] block mb-1">
                  Why Groq?
                </span>
                Groq utilizes custom Language Processing Units (LPUs) engineered for deterministic tensor streaming. Responses stream at 300 to 800+ tokens per second, providing instant real-time AI responses.
              </div>
            </div>
          )}

          {/* MODEL & PROMPT TAB */}
          {activeTab === 'model' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#ececec] mb-1.5">
                  Custom Instructions (System Prompt)
                </label>
                <textarea
                  value={tempSystemPrompt}
                  onChange={(e) => setTempSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-[#2f2f2f] text-xs leading-relaxed text-[#ececec] border border-[#424242] focus:border-[#10a37f] focus:outline-none resize-none font-sans"
                  placeholder="Set custom behavior, formatting preferences, or persona..."
                />
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-[#ececec]">Temperature</span>
                  <span className="font-mono text-xs text-[#10a37f]">{tempTemperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={tempTemperature}
                  onChange={(e) => setTempTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[#10a37f] bg-[#2f2f2f] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#8e8e8e] mt-1">
                  <span>Precise & Focused (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Creative (1.5)</span>
                </div>
              </div>

              {/* Max Tokens Slider */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-[#ececec]">Max Output Tokens</span>
                  <span className="font-mono text-xs text-[#10a37f]">{tempMaxTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={tempMaxTokens}
                  onChange={(e) => setTempMaxTokens(parseInt(e.target.value, 10))}
                  className="w-full accent-[#10a37f] bg-[#2f2f2f] h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#8e8e8e] mt-1">
                  <span>256 tokens</span>
                  <span>2048 tokens</span>
                  <span>4096 tokens</span>
                </div>
              </div>
            </div>
          )}

          {/* DATA CONTROLS TAB */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              {/* Database Sync Status Card */}
              <div className="p-4 rounded-xl bg-[#282828] border border-[#383838]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#10a37f]" />
                    <h4 className="text-sm font-medium text-[#ececec]">Cloud Database</h4>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                      isFirebaseConfigured
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {isFirebaseConfigured ? 'Firestore Active' : 'LocalStorage Fallback'}
                  </span>
                </div>
                <p className="text-xs text-[#8e8e8e]">
                  {isFirebaseConfigured
                    ? 'All chats are safely synchronized with Google Firebase Firestore in real-time.'
                    : 'Chats are stored in your browser. Add your Firebase keys in .env to sync chats across devices.'}
                </p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#282828] border border-[#383838]">
                <div>
                  <h4 className="text-sm font-medium text-[#ececec]">Export Conversations</h4>
                  <p className="text-xs text-[#8e8e8e]">Download all chat history as a JSON backup.</p>
                </div>
                <button
                  type="button"
                  onClick={onExportChats}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#383838] hover:bg-[#484848] text-white rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#282828] border border-[#383838]">
                <div>
                  <h4 className="text-sm font-medium text-red-400">Delete All Chats</h4>
                  <p className="text-xs text-[#8e8e8e]">Permanently delete all conversation history.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
                      onClearAllChats();
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2f2f2f] bg-[#1e1e1e]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#ececec] hover:bg-[#2f2f2f] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 text-xs font-semibold bg-[#10a37f] hover:bg-[#0e8e6e] text-white rounded-xl transition-colors shadow-md"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

