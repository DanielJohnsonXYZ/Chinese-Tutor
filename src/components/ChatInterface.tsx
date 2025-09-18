'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      content: 'Hello! I\'m your Chinese language tutor. I\'ll teach you Chinese using English explanations with characters and pinyin pronunciation. Let\'s start with a simple greeting: 你好 (nǐ hǎo) - hello! Can you try saying hello in Chinese?',
      isUser: false,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim(), messages })
      })

      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error connecting to the tutor. Please try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      content: 'Hello! I\'m your Chinese language tutor. I\'ll teach you Chinese using English explanations with characters and pinyin pronunciation. Let\'s start with a simple greeting: 你好 (nǐ hǎo) - hello! Can you try saying hello in Chinese?',
      isUser: false,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  const askForCorrection = () => {
    if (messages.length < 2) return
    
    setInput('Can you correct what I just said?')
  }

  const askForExplanation = () => {
    if (messages.length < 2) return
    
    setInput('Can you explain what you just taught me?')
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-yellow-50 rounded-xl shadow-xl border border-red-100 h-[700px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-sm ${
                message.isUser
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <p className="text-sm leading-relaxed font-medium">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-red-100 bg-white/50 backdrop-blur-sm p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={askForCorrection}
            className="px-4 py-2 text-sm bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-full hover:from-yellow-200 hover:to-yellow-300 transition-all duration-200 shadow-sm border border-yellow-300 font-medium"
          >
            ✏️ Correct Me
          </button>
          <button
            onClick={askForExplanation}
            className="px-4 py-2 text-sm bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-full hover:from-green-200 hover:to-green-300 transition-all duration-200 shadow-sm border border-green-300 font-medium"
          >
            💡 Explain
          </button>
          <button
            onClick={clearChat}
            className="px-4 py-2 text-sm bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-full hover:from-red-200 hover:to-red-300 transition-all duration-200 shadow-sm border border-red-300 font-medium"
          >
            🔄 New Lesson
          </button>
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message or try Chinese..."
            className="flex-1 border border-red-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 bg-white shadow-sm font-medium"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}