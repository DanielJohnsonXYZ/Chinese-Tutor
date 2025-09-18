'use client'

import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">中文对话练习</h1>
            <p className="text-gray-600">Practice Chinese conversation with AI tutor</p>
          </header>
          <ChatInterface />
        </div>
      </div>
    </main>
  )
}
