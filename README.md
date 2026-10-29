# ChatGPT Clone (Groq Edition) ⚡ - Next.js & TypeScript

A high-fidelity, pixel-perfect copy of **ChatGPT** powered by **Groq LPUs (Language Processing Units)** for blazing-fast inference (300 to 800+ tokens/second), built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

![ChatGPT Groq Clone](https://raw.githubusercontent.com/groq/groq-api-cookbook/main/images/groq-logo.png)

---

## ✨ Features

- 🎯 **Faithful ChatGPT User Experience**:
  - Exact OpenAI dark theme styling (`#212121`, `#171717`, `#2f2f2f`).
  - Collapsible sidebar with smart date grouping (**Today**, **Yesterday**, **Previous 7 Days**, **Older**).
  - Floating capsule prompt bar with auto-expanding textarea, Enter to send, Shift+Enter for new line.
  - Interactive starter cards on new conversations ("Code an algorithm", "Explain complex topic", etc.).

- ⚡ **Powered by Groq LPUs**:
  - **ChatGPT 4o** (`llama-3.3-70b-versatile`): Flagship reasoning and intelligence, 128k context.
  - **ChatGPT 4o mini** (`llama-3.1-8b-instant`): Blazing fast 800+ tokens/sec for rapid tasks.
  - **ChatGPT o1** (`deepseek-r1-distill-llama-70b`): Advanced reasoning model featuring a collapsible **"Thought process"** accordion step-by-step thinking block just like OpenAI o1!
  - **ChatGPT Vision** (`llama-3.2-11b-vision-preview`): Multimodal image understanding and photo analysis.
  - **Mixtral 8x7B** (`mixtral-8x7b-32768`): High-throughput MoE model.

- 💬 **Streaming & Markdown Rendering**:
  - Real-time token streaming with smooth blinking cursor via Next.js Route Handlers (SSE).
  - Syntax-highlighted code blocks with language badge and one-click **"Copy code"**.
  - **LaTeX Math rendering** via KaTeX ($E = mc^2$, fractions, matrices, calculus).
  - Tables, blockquotes, ordered/unordered lists.
  - Live performance badge showing **generation time** and **tokens per second (tps)**.

- 🎙️ **Voice Chat (Groq Whisper)**:
  - Microphone recording in the input capsule.
  - Transcribes audio into text using Groq's `whisper-large-v3-turbo` model via `/api/transcribe`.

- 📎 **Attachments & Vision**:
  - Upload screenshots or photos for vision model inspection.
  - Attach text/code files (.txt, .py, .js, .json, .csv) to augment your prompt.

- 🛠️ **Chat Management & In-App Settings**:
  - Rename, delete, and pin chats.
  - Edit past user messages to branch conversations.
  - Text-to-speech ("Read aloud") button.
  - Groq API Key configuration in the settings modal (stored securely in `localStorage`) or via `.env`.
  - Custom Instructions (System Prompt) editor.
  - Temperature and Max Output Tokens sliders.
  - Export chat history as JSON.

---

## 🚀 Quick Start

### 1. Get a Free Groq API Key
1. Go to [console.groq.com/keys](https://console.groq.com/keys).
2. Sign in and click **"Create API Key"**.
3. Copy your key (starts with `gsk_...`).

### 2. Configure Your Key
You have two easy ways to set your key:
- **Option A (In-App Settings)**: Launch the app, open **Settings** (gear icon or bottom profile), and paste your key in the **Groq API Key** field.
- **Option B (.env file)**: Open the `.env` file in the project folder and set:
  ```env
  GROQ_API_KEY=gsk_your_groq_api_key_here
  ```

### 3. Start Development Server

```bash
# Run Next.js in development mode
npm run dev

# Or check TypeScript types
npm run type-check

# Or production build & start
npm run build
npm start
```

Open your browser at:
- **`http://localhost:3000`**

---

## 📁 Next.js + TypeScript Architecture

```
chatgpt-groq/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts        # Groq streaming SSE API handler
│   │   │   ├── transcribe/route.ts  # Whisper audio speech-to-text handler
│   │   │   ├── models/route.ts      # List available Groq models
│   │   │   └── health/route.ts      # Health & API connection check
│   │   ├── globals.css              # Tailwind CSS & custom styling
│   │   ├── layout.tsx               # Next.js Root Layout with KaTeX & metadata
│   │   └── page.tsx                 # Client entry point
│   ├── components/
│   │   ├── ChatGPTApp.tsx           # Main chat app controller
│   │   ├── Sidebar.tsx              # Chat history, categorization & search
│   │   ├── ChatHeader.tsx           # Model switcher dropdown & Groq status
│   │   ├── ChatInput.tsx            # Signature input pill, mic & attachments
│   │   ├── MessageItem.tsx          # Markdown, KaTeX, reasoning & code blocks
│   │   ├── CodeBlock.tsx            # Formatted code viewer with copy button
│   │   ├── EmptyState.tsx           # New chat landing page with starter prompts
│   │   └── SettingsModal.tsx        # API key, custom instructions & sliders
│   ├── types/
│   │   └── index.ts                 # Full TypeScript interfaces (Chat, Message, Model, etc.)
│   └── constants.ts                 # Model specs & default system prompt
├── tsconfig.json                    # TypeScript compiler options & Next.js plugin
├── next.config.mjs                  # Next.js configuration
├── tailwind.config.js               # Tailwind configuration
└── package.json                     # Dependencies & scripts
```
