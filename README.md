# Chinese Conversation Tutor

A simple web-based chat application powered by Claude AI to help practice Chinese conversation skills.

## Features

- 🗣️ Natural Chinese conversation practice
- 🎯 Gentle corrections that keep conversation flowing
- 📝 Quick buttons for corrections and English explanations
- 🧹 Clear chat functionality
- 💬 Real-time chat interface

## Setup

1. **Clone and install dependencies:**
   ```bash
   cd chinese-tutor
   npm install
   ```

2. **Set up your Claude API key:**
   - Get an API key from [Anthropic Console](https://console.anthropic.com/)
   - Copy `.env.local` and add your API key:
     ```
     ANTHROPIC_API_KEY=your_actual_api_key_here
     ```

3. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. **Connect to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create chinese-tutor --public --push --source=.
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variable: `ANTHROPIC_API_KEY`
   - Deploy!

## Usage

- **Chat in Chinese:** Just type and practice natural conversation
- **Ask for corrections:** Click "请纠正" or type "请纠正我刚才说的话"
- **Get explanations:** Click "请解释" or type "请用英文解释一下你刚才说的话"
- **Clear chat:** Click "清除对话" to start fresh

## Tech Stack

- Next.js 14 with TypeScript
- Tailwind CSS
- Claude 3.5 Sonnet API
- Vercel for deployment
