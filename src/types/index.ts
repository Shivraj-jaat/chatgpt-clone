export interface Attachment {
  type: 'image' | 'file';
  name: string;
  data: string;
  mimeType?: string;
  size?: number;
  originalSize?: number;
  compressed?: boolean;
}

export interface MessageStats {
  duration?: string;
  tokens?: number;
  tps?: string | number;
  model?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  reasoning?: string;
  isThinking?: boolean;
  model?: string;
  createdAt: string;
  stats?: MessageStats;
}

export interface Model {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  badgeColor: string;
  description: string;
  speed: string;
  context: string;
  isDefault: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  messages: Message[];
  pinned?: boolean;
  userId?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export interface PromptSuggestion {
  title: string;
  prompt: string;
  icon: 'code' | 'sparkles' | 'terminal' | 'pen-tool' | string;
}

export interface SettingsState {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

