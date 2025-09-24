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
  const [wordsLearned, setWordsLearned] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Audio synthesis for Chinese pronunciation
  const speakChinese = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  // Track learned vocabulary
  const trackLearnedWords = (content: string) => {
    const chineseWords = content.match(/[\u4e00-\u9fff]+/g)
    if (chineseWords) {
      setWordsLearned(prev => {
        const newSet = new Set(prev)
        chineseWords.forEach(word => newSet.add(word))
        return newSet
      })
    }
  }

  // Load messages and progress from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chinese-tutor-messages')
    const savedWords = localStorage.getItem('chinese-tutor-words')
    
    if (savedWords) {
      try {
        const parsedWords = JSON.parse(savedWords)
        setWordsLearned(new Set(parsedWords))
      } catch (error) {
        console.error('Error loading saved words:', error)
      }
    }
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(parsedMessages)
        // Track words from loaded messages
        parsedMessages.forEach((msg: Message) => {
          if (!msg.isUser) trackLearnedWords(msg.content)
        })
        return
      } catch (error) {
        console.error('Error loading saved messages:', error)
      }
    }
    
    // Default welcome message if no saved messages
    const welcomeMessage: Message = {
      id: '1',
      content: 'Hello! I\'m your friendly Chinese tutor. I\'m here to help you learn Chinese through natural conversation. I\'ll teach you using English explanations, then show you the Chinese characters with pinyin pronunciation.\n\nLet\'s start simple - try saying hello to me in English, and I\'ll show you how to say it in Chinese! 😊',
      isUser: false,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chinese-tutor-messages', JSON.stringify(messages))
    }
  }, [messages])

  // Save learned words to localStorage
  useEffect(() => {
    if (wordsLearned.size > 0) {
      localStorage.setItem('chinese-tutor-words', JSON.stringify([...wordsLearned]))
    }
  }, [wordsLearned])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault()
            sendMessage()
            break
          case 'l':
            e.preventDefault()
            clearChat()
            break
          case 'k':
            e.preventDefault()
            askForCorrection()
            break
          case 'e':
            e.preventDefault()
            askForExplanation()
            break
        }
      }
      if (e.key === 'Escape') {
        setInput('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [input])


  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    // Input validation
    if (input.trim().length > 500) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Please keep your message under 500 characters.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Sorry, I didn\'t receive a proper response. Please try again.',
        isUser: false,
        timestamp: new Date()
      }

      // Track learned words from AI response
      trackLearnedWords(aiMessage.content)
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error && error.message.includes('HTTP error') 
          ? 'The tutor service is temporarily unavailable. Please try again in a moment.'
          : 'Sorry, there was an error connecting to the tutor. Please check your internet connection and try again.',
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
      content: 'Hello! I\'m your friendly Chinese tutor. I\'m here to help you learn Chinese through natural conversation. I\'ll teach you using English explanations, then show you the Chinese characters with pinyin pronunciation.\n\nLet\'s start simple - try saying hello to me in English, and I\'ll show you how to say it in Chinese! 😊',
      isUser: false,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    localStorage.removeItem('chinese-tutor-messages')
    // Keep learned words when clearing chat
  }

  const askForCorrection = () => {
    if (messages.length < 2) return
    
    setInput('Can you correct what I just said?')
  }

  const askForExplanation = () => {
    if (messages.length < 2) return
    
    setInput('Can you explain what you just taught me?')
  }

  const startTopicLesson = (topic: string) => {
    setInput(`Let's practice Chinese conversation about ${topic}. Can you start us off with a simple scenario?`)
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-yellow-50 rounded-xl shadow-xl border border-red-100 h-[700px] sm:h-[600px] md:h-[700px] lg:h-[800px] flex flex-col">
      {/* Progress indicator */}
      <div className="px-4 sm:px-6 py-3 border-b border-red-100 bg-gradient-to-r from-red-100/50 to-yellow-100/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-red-800 font-medium">Chinese Vocabulary Progress</span>
          <span className="bg-red-200 px-2 py-1 rounded-full text-red-800 font-medium">
            {wordsLearned.size} words learned
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[280px] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-xl shadow-sm ${
                message.isUser
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <div className="text-sm leading-relaxed font-medium">
                {message.content.split('\n').map((line, index) => {
                  // Check if line contains Chinese characters
                  const chineseMatch = line.match(/[\u4e00-\u9fff]+(\s*\([^)]+\))?/g)
                  if (chineseMatch && !message.isUser) {
                    return (
                      <p key={index} className="mb-1">
                        {line.split(/([\u4e00-\u9fff]+(\s*\([^)]+\))?)/g).map((part, partIndex) => {
                          const isChinesePart = /[\u4e00-\u9fff]+(\s*\([^)]+\))?/.test(part)
                          if (isChinesePart) {
                            const chineseOnly = part.replace(/\s*\([^)]+\)/g, '')
                            return (
                              <span
                                key={partIndex}
                                className="inline-flex items-center gap-1 bg-red-50 px-1 py-0.5 rounded border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                                onClick={() => speakChinese(chineseOnly)}
                                title="Click to hear pronunciation"
                              >
                                {part}
                                <span className="text-xs">🔊</span>
                              </span>
                            )
                          }
                          return <span key={partIndex}>{part}</span>
                        })}
                      </p>
                    )
                  }
                  return <p key={index} className="mb-1">{line}</p>
                })}
              </div>
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

      <div className="border-t border-red-100 bg-white/50 backdrop-blur-sm p-4 sm:p-6">
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <button
            onClick={askForCorrection}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-full hover:from-yellow-200 hover:to-yellow-300 transition-all duration-200 shadow-sm border border-yellow-300 font-medium"
            title="Keyboard shortcut: Ctrl+K"
          >
            ✏️ Correct Me
          </button>
          <button
            onClick={askForExplanation}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-full hover:from-green-200 hover:to-green-300 transition-all duration-200 shadow-sm border border-green-300 font-medium"
            title="Keyboard shortcut: Ctrl+E"
          >
            💡 Explain
          </button>
          <button
            onClick={() => startTopicLesson('food and restaurants')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full hover:from-blue-200 hover:to-blue-300 transition-all duration-200 shadow-sm border border-blue-300 font-medium"
          >
            🍜 Food Topic
          </button>
          <button
            onClick={() => startTopicLesson('shopping')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-full hover:from-purple-200 hover:to-purple-300 transition-all duration-200 shadow-sm border border-purple-300 font-medium"
          >
            🛍️ Shopping
          </button>
          <button
            onClick={clearChat}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-full hover:from-red-200 hover:to-red-300 transition-all duration-200 shadow-sm border border-red-300 font-medium"
            title="Keyboard shortcut: Ctrl+L"
          >
            🔄 New Lesson
          </button>
        </div>
        
        <div className="flex space-x-1.5 sm:space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message or try Chinese..."
            className="flex-1 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 bg-white shadow-sm font-medium text-sm sm:text-base"
            disabled={isLoading}
            maxLength={500}
            aria-label="Type your message to the Chinese tutor"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm font-medium text-sm sm:text-base"
            title="Keyboard shortcut: Ctrl+Enter"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}