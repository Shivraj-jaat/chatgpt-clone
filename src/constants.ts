import { Model, PromptSuggestion } from './types';

export const KNOWN_MODELS: Record<string, Partial<Model>> = {
  'openai/gpt-oss-120b': {
    name: 'ChatGPT 4o (GPT-OSS 120B)',
    shortName: 'GPT-OSS 120B',
    badge: 'Flagship & Reasoning',
    badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    description: 'Premier 120B flagship model with deep reasoning and step-by-step thinking.',
    speed: '~350 tps',
    context: '128k',
    supportsVision: false,
    supportsReasoning: true,
  },
  'openai/gpt-oss-20b': {
    name: 'ChatGPT 4o mini (GPT-OSS 20B)',
    shortName: 'GPT-OSS 20B',
    badge: 'Blazing Fast',
    badgeColor: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    description: 'Ultra-fast 20B model for everyday chat, instant code snippets, and quick answers.',
    speed: '~800 tps',
    context: '128k',
    supportsVision: false,
    supportsReasoning: false,
  },
  'qwen/qwen3.8-27b': {
    name: 'ChatGPT 4o (Qwen 27B)',
    shortName: 'GPT-4o',
    badge: 'Flagship',
    badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    description: 'Flagship 27B multilingual model with strong coding, math, and reasoning.',
    speed: '~500 tps',
    context: '64k',
    supportsVision: false,
    supportsReasoning: false,
  },
  'allam-2-7b': {
    name: 'Allam 2 (7B)',
    shortName: 'Allam 7B',
    badge: 'Lightweight',
    badgeColor: 'bg-teal-600/20 text-teal-400 border-teal-500/30',
    description: 'Compact conversational model optimized for swift answers.',
    speed: '~900 tps',
    context: '32k',
    supportsVision: false,
    supportsReasoning: false,
  },
  'llama-3.3-70b-versatile': {
    name: 'ChatGPT 4o (Llama 3.3 70B)',
    shortName: 'GPT-4o (70B)',
    badge: 'Flagship',
    badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    description: 'Most intelligent & versatile flagship model. Fast, nuanced, 128k context.',
    speed: '~280 tps',
    context: '128k',
    supportsVision: false,
    supportsReasoning: false,
  },
  'llama-3.1-8b-instant': {
    name: 'ChatGPT 4o mini (Llama 3.1 8B)',
    shortName: 'GPT-4o mini',
    badge: 'Blazing Fast',
    badgeColor: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    description: 'Ultra-fast inference (800+ tps) for quick answers, drafting, and instant tasks.',
    speed: '~800 tps',
    context: '128k',
    supportsVision: false,
    supportsReasoning: false,
  },
  'deepseek-r1-distill-llama-70b': {
    name: 'ChatGPT o1 (DeepSeek R1 70B)',
    shortName: 'o1 Reasoning',
    badge: 'Reasoning',
    badgeColor: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
    description: 'Advanced reasoning model with visible step-by-step thinking chain of thought.',
    speed: '~260 tps',
    context: '128k',
    supportsVision: false,
    supportsReasoning: true,
  },
  'llama-3.2-11b-vision-preview': {
    name: 'ChatGPT Vision (Llama 3.2 11B)',
    shortName: 'GPT Vision',
    badge: 'Vision',
    badgeColor: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    description: 'Multimodal vision model for analyzing images, screenshots, diagrams, and photos.',
    speed: '~400 tps',
    context: '128k',
    supportsVision: true,
    supportsReasoning: false,
  },
  'mixtral-8x7b-32768': {
    name: 'Mixtral 8x7B MoE',
    shortName: 'Mixtral 8x7B',
    badge: 'High Throughput',
    badgeColor: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
    description: 'Mixture-of-Experts high throughput model with 32k context.',
    speed: '~500 tps',
    context: '32k',
    supportsVision: false,
    supportsReasoning: false,
  }
};

export const DEFAULT_FALLBACK_MODELS: Model[] = [
  {
    id: 'qwen/qwen3.8-27b',
    name: 'ChatGPT 4o (Qwen 27B)',
    shortName: 'GPT-4o',
    badge: 'Flagship',
    badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    description: 'Flagship 27B multilingual model with strong coding, math, and reasoning.',
    speed: '~500 tps',
    context: '64k',
    isDefault: true,
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'ChatGPT 4o mini (GPT-OSS 20B)',
    shortName: 'GPT-4o mini',
    badge: 'Blazing Fast',
    badgeColor: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    description: 'Ultra-fast 20B model for everyday chat, instant code snippets, and quick answers.',
    speed: '~800 tps',
    context: '128k',
    isDefault: false,
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'ChatGPT o1 (GPT-OSS 120B)',
    shortName: 'GPT-o1',
    badge: 'Reasoning',
    badgeColor: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
    description: 'Premier 120B flagship model with deep reasoning and step-by-step thinking.',
    speed: '~350 tps',
    context: '128k',
    isDefault: false,
    supportsVision: false,
    supportsReasoning: true,
  },
  {
    id: 'allam-2-7b',
    name: 'ChatGPT (Allam 2 7B)',
    shortName: 'Allam 7B',
    badge: 'Lightweight',
    badgeColor: 'bg-teal-600/20 text-teal-400 border-teal-500/30',
    description: 'Compact conversational model optimized for swift answers and low latency.',
    speed: '~900 tps',
    context: '32k',
    isDefault: false,
    supportsVision: false,
    supportsReasoning: false,
  },
];

export const MODELS: Model[] = DEFAULT_FALLBACK_MODELS;

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    title: 'Generate AI Image',
    prompt: 'Generate an image of a futuristic cyberpunk city with neon lights, flying cars, and rain reflections.',
    icon: 'sparkles'
  },
  {
    title: 'Code an algorithm',
    prompt: 'Write an optimized TypeScript function for finding the shortest path in a weighted graph using Dijkstra\'s algorithm, with explanatory comments and complexity analysis.',
    icon: 'code'
  },
  {
    title: 'Explain complex topic',
    prompt: 'Explain how Transformers and Attention Mechanisms work under the hood in deep learning, using clear analogies and visual intuition.',
    icon: 'sparkles'
  },
  {
    title: 'Debug code',
    prompt: 'Here is my code that is causing memory leaks and performance bottlenecks. Help me identify the root cause and refactor it cleanly.',
    icon: 'terminal'
  },
  {
    title: 'Draft email or document',
    prompt: 'Draft an executive project update email to stakeholders summarizing milestone completions, upcoming deliverables, and key risks.',
    icon: 'pen-tool'
  }
];

export const DEFAULT_SYSTEM_PROMPT =
`You are a helpful AI assistant. Answer clearly using Markdown. Use code blocks with language tags for code, and LaTeX ($...$) for math. Be concise but thorough.`;
