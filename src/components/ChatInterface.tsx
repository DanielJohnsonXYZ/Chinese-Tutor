'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface UserLevel {
  level: 'beginner' | 'elementary' | 'intermediate' | 'advanced'
  hskLevel: number
  confidence: number
  strengths: string[]
  weaknesses: string[]
  lastAssessed: Date
}

interface LessonRecommendation {
  id: string
  title: string
  description: string
  difficulty: number
  topics: string[]
  estimatedTime: number
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [wordsLearned, setWordsLearned] = useState<Set<string>>(new Set())
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null)
  const [recommendations, setRecommendations] = useState<LessonRecommendation[]>([])
  const [showLevelAssessment, setShowLevelAssessment] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [successfulResponses, setSuccessfulResponses] = useState(0)
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

  // Analyze user performance and detect level
  const analyzeUserLevel = useCallback((userMessage: string, aiResponse: string) => {
    const hasChineseInput = /[\u4e00-\u9fff]/.test(userMessage)
    const complexityScore = calculateComplexity(userMessage)
    const errorIndicators = detectErrors(aiResponse)
    
    if (errorIndicators > 0) {
      setErrorCount(prev => prev + 1)
    } else if (hasChineseInput) {
      setSuccessfulResponses(prev => prev + 1)
    }

    // Update level based on accumulated data
    updateUserLevel(complexityScore, errorIndicators)
  }, [errorCount, successfulResponses])

  const calculateComplexity = (text: string): number => {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const wordCount = text.split(/\s+/).length
    const hasComplexStructure = /[，。！？；：]/.test(text)
    
    let score = 0
    if (chineseChars > 0) score += Math.min(chineseChars / 5, 3) // Max 3 points for character count
    if (wordCount > 10) score += 1
    if (hasComplexStructure) score += 2
    
    return Math.min(score, 10) // Cap at 10
  }

  const detectErrors = (aiResponse: string): number => {
    const errorKeywords = [
      '正确的说法是', '应该说', '更好的表达是', 'correct way', 
      'should be', 'mistake', 'error', '错误', '不对'
    ]
    return errorKeywords.filter(keyword => 
      aiResponse.toLowerCase().includes(keyword.toLowerCase())
    ).length
  }

  const updateUserLevel = useCallback((complexity: number, errors: number) => {
    const totalInteractions = successfulResponses + errorCount
    if (totalInteractions < 3) return // Need more data

    const successRate = totalInteractions > 0 ? successfulResponses / totalInteractions : 0
    const avgComplexity = complexity
    
    let level: UserLevel['level'] = 'beginner'
    let hskLevel = 1
    let confidence = 0.5

    if (successRate > 0.8 && avgComplexity > 6) {
      level = 'advanced'
      hskLevel = 5
      confidence = 0.9
    } else if (successRate > 0.6 && avgComplexity > 4) {
      level = 'intermediate'
      hskLevel = 3
      confidence = 0.8
    } else if (successRate > 0.4 && avgComplexity > 2) {
      level = 'elementary'
      hskLevel = 2
      confidence = 0.7
    }

    const newLevel: UserLevel = {
      level,
      hskLevel,
      confidence,
      strengths: determineStrengths(successRate, avgComplexity),
      weaknesses: determineWeaknesses(errors, successRate),
      lastAssessed: new Date()
    }

    setUserLevel(newLevel)
    localStorage.setItem('chinese-tutor-level', JSON.stringify(newLevel))
    generateRecommendations(newLevel)
  }, [successfulResponses, errorCount, wordsLearned.size])

  const determineStrengths = (successRate: number, complexity: number): string[] => {
    const strengths = []
    if (successRate > 0.7) strengths.push('Good comprehension')
    if (complexity > 5) strengths.push('Complex sentence structure')
    if (wordsLearned.size > 20) strengths.push('Growing vocabulary')
    return strengths
  }

  const determineWeaknesses = (errors: number, successRate: number): string[] => {
    const weaknesses = []
    if (errors > 3) weaknesses.push('Grammar accuracy')
    if (successRate < 0.5) weaknesses.push('Overall fluency')
    if (wordsLearned.size < 10) weaknesses.push('Limited vocabulary')
    return weaknesses
  }

  const generateRecommendations = (level: UserLevel) => {
    const recommendations: LessonRecommendation[] = []
    
    if (level.level === 'beginner') {
      recommendations.push(
        {
          id: '1',
          title: 'Basic Greetings & Introductions',
          description: 'Master essential everyday greetings and self-introduction',
          difficulty: 1,
          topics: ['greetings', 'introductions', 'basic phrases'],
          estimatedTime: 15
        },
        {
          id: '2', 
          title: 'Numbers & Time',
          description: 'Learn to count and tell time in Chinese',
          difficulty: 2,
          topics: ['numbers', 'time', 'dates'],
          estimatedTime: 20
        }
      )
    } else if (level.level === 'elementary') {
      recommendations.push(
        {
          id: '3',
          title: 'Daily Routines & Activities',
          description: 'Express your daily activities and hobbies',
          difficulty: 3,
          topics: ['daily life', 'hobbies', 'verbs'],
          estimatedTime: 25
        }
      )
    } else if (level.level === 'intermediate') {
      recommendations.push(
        {
          id: '4',
          title: 'Complex Conversations',
          description: 'Practice discussing opinions and abstract topics',
          difficulty: 4,
          topics: ['opinions', 'culture', 'advanced grammar'],
          estimatedTime: 30
        }
      )
    }

    // Add weakness-specific recommendations
    if (level.weaknesses.includes('Grammar accuracy')) {
      recommendations.push({
        id: 'grammar-1',
        title: 'Grammar Pattern Practice',
        description: 'Focus on correct sentence structures and common patterns',
        difficulty: level.hskLevel,
        topics: ['grammar', 'sentence patterns'],
        estimatedTime: 20
      })
    }

    setRecommendations(recommendations)
  }

  // Load messages and progress from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chinese-tutor-messages')
    const savedWords = localStorage.getItem('chinese-tutor-words')
    const savedLevel = localStorage.getItem('chinese-tutor-level')
    
    if (savedWords) {
      try {
        const parsedWords = JSON.parse(savedWords)
        setWordsLearned(new Set(parsedWords))
      } catch (error) {
        console.error('Error loading saved words:', error)
      }
    }

    if (savedLevel) {
      try {
        const parsedLevel = JSON.parse(savedLevel)
        parsedLevel.lastAssessed = new Date(parsedLevel.lastAssessed)
        setUserLevel(parsedLevel)
        generateRecommendations(parsedLevel)
      } catch (error) {
        console.error('Error loading saved level:', error)
      }
    } else {
      // Show level assessment for new users
      setTimeout(() => setShowLevelAssessment(true), 3000)
    }
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: Message & { timestamp: string }) => ({
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

  const sendMessage = useCallback(async () => {
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
      
      // Analyze user level based on conversation
      analyzeUserLevel(userMessage.content, aiMessage.content)
      
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
  }, [input, messages, isLoading, analyzeUserLevel])

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

  const askForCorrection = useCallback(() => {
    if (messages.length < 2) return
    
    setInput('Can you correct what I just said?')
  }, [messages.length])

  const askForExplanation = useCallback(() => {
    if (messages.length < 2) return
    
    setInput('Can you explain what you just taught me?')
  }, [messages.length])

  const startTopicLesson = (topic: string) => {
    setInput(`Let's practice Chinese conversation about ${topic}. Can you start us off with a simple scenario?`)
  }

  const startRecommendedLesson = (recommendation: LessonRecommendation) => {
    setInput(`I'd like to practice "${recommendation.title}". ${recommendation.description} Can you help me with this?`)
  }

  const quickLevelAssessment = () => {
    setShowLevelAssessment(false)
    setInput("I'd like you to assess my Chinese level. Can you give me a few phrases to try so you can understand my current ability?")
  }

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
  }, [input, sendMessage, askForCorrection, askForExplanation])

  return (
    <div className="bg-gradient-to-br from-red-50 to-yellow-50 rounded-xl shadow-xl border border-red-100 h-[700px] sm:h-[600px] md:h-[700px] lg:h-[800px] flex flex-col">
      {/* Level Assessment Modal */}
      {showLevelAssessment && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
          <div className="bg-white rounded-xl p-6 m-4 max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-red-800 mb-3">Welcome to Your Chinese Learning Journey! 🎓</h3>
            <p className="text-gray-700 mb-4">
              I&apos;m your intelligent AI tutor. I&apos;ll automatically assess your Chinese level as we chat and provide personalized lessons just for you.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={quickLevelAssessment}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700"
              >
                Start Assessment
              </button>
              <button 
                onClick={() => setShowLevelAssessment(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress and Level indicator */}
      <div className="px-4 sm:px-6 py-3 border-b border-red-100 bg-gradient-to-r from-red-100/50 to-yellow-100/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-red-800 font-medium">Progress</span>
            <span className="bg-red-200 px-2 py-1 rounded-full text-red-800 font-medium">
              {wordsLearned.size} words learned
            </span>
            {userLevel && (
              <span className="bg-blue-200 px-2 py-1 rounded-full text-blue-800 font-medium capitalize">
                {userLevel.level} • HSK {userLevel.hskLevel}
              </span>
            )}
          </div>
          {userLevel && (
            <div className="text-xs text-gray-600">
              Confidence: {Math.round(userLevel.confidence * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Recommendations bar */}
      {recommendations.length > 0 && (
        <div className="px-4 sm:px-6 py-2 border-b border-red-100 bg-white/70">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-800 font-medium">💡 Recommended:</span>
            <div className="flex gap-2 overflow-x-auto">
              {recommendations.slice(0, 2).map(rec => (
                <button
                  key={rec.id}
                  onClick={() => startRecommendedLesson(rec)}
                  className="flex-shrink-0 bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  title={`${rec.description} (${rec.estimatedTime} min)`}
                >
                  {rec.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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