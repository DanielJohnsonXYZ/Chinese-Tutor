'use client'

import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-red-100 via-yellow-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-800 mb-3">
              Chinese Language Tutor
              <span className="block text-2xl text-yellow-600 font-normal mt-2">
                中文老师 (zhōngwén lǎoshī)
              </span>
            </h1>
            <p className="text-gray-700 text-lg">Learn Chinese with English instruction, characters, and pinyin pronunciation</p>
          </header>
          <ChatInterface />
        </div>
      </div>
    </main>
  )
}
