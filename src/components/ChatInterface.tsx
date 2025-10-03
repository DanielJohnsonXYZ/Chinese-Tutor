'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import MessageBubble from './MessageBubble'
import { setItemSafe, getItemSafe, debounce, truncateMessages } from '@/utils/localStorage'
import { fetchJsonWithRetry } from '@/utils/apiRetry'
import { validateAndSanitizeMessage } from '@/utils/sanitize'
import {
  INPUT_CONSTRAINTS,
  STORAGE_CONFIG,
  STORAGE_KEYS,
  LEVEL_ASSESSMENT,
  SPEECH_CONFIG,
  UI_TIMEOUTS,
  VOCAB_THRESHOLDS,
  ERROR_THRESHOLDS,
  SUCCESS_THRESHOLDS,
  COMPLEXITY_SCORING,
  API_CONFIG
} from '@/constants/app'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  messageType?: 'normal' | 'correction' | 'encouragement' | 'cultural' | 'grammar'
  suggestions?: string[]
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

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
    }
  }
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new() => SpeechRecognitionInterface;
    webkitSpeechRecognition?: new() => SpeechRecognitionInterface;
  }
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
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [dailyStreak, setDailyStreak] = useState(0)
  const [lastPracticeDate, setLastPracticeDate] = useState<string | null>(null)
  const [conversationTopics, setConversationTopics] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [conversationStarters, setConversationStarters] = useState<string[]>([])
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesRef = useRef<Message[]>([])
  const inputRef = useRef<string>('')

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = SPEECH_CONFIG.CONTINUOUS
        recognitionRef.current.interimResults = SPEECH_CONFIG.INTERIM_RESULTS
        recognitionRef.current.lang = SPEECH_CONFIG.LANG
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript
          setInput(transcript)
          setIsListening(false)
        }
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }
        
        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
  }, [])

  // Audio synthesis for Chinese pronunciation
  const speakChinese = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = SPEECH_CONFIG.LANG
      utterance.rate = SPEECH_CONFIG.RATE

      // Function to set voice
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices()
        const chineseVoice = voices.find(voice =>
          voice.lang.includes('zh') ||
          voice.name.toLowerCase().includes('chinese') ||
          voice.name.toLowerCase().includes('mandarin')
        )
        if (chineseVoice) {
          utterance.voice = chineseVoice
        }
      }

      // Try to set voice immediately
      setVoice()

      // Chrome bug workaround: voices load asynchronously
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', setVoice, { once: true })
      }

      window.speechSynthesis.speak(utterance)
    }
  }, [])

  // Start voice recording
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  // Stop voice recording
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Update daily practice streak
  const updateDailyStreak = useCallback(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

    if (lastPracticeDate === today) {
      // Already practiced today
      return
    }

    if (lastPracticeDate === yesterday) {
      // Consecutive day - increment streak
      setDailyStreak(prev => {
        const newStreak = prev + 1
        localStorage.setItem('chinese-tutor-streak', newStreak.toString())
        return newStreak
      })
    } else if (lastPracticeDate && lastPracticeDate !== yesterday) {
      // Streak broken - reset to 1
      setDailyStreak(1)
      localStorage.setItem('chinese-tutor-streak', '1')
    } else {
      // First time or no previous practice
      setDailyStreak(1)
      localStorage.setItem('chinese-tutor-streak', '1')
    }

    setLastPracticeDate(today)
    localStorage.setItem('chinese-tutor-last-practice', today)
  }, [lastPracticeDate])

  // Analyze message content and generate smart suggestions
  const analyzeMessageContent = (content: string, userLevel: UserLevel | null) => {
    const corrections = ['correct', '正确', 'should be', 'better way', '更好的表达']
    const encouragement = ['great', 'good', 'excellent', 'well done', 'getting better', '很棒', '不错']
    const cultural = ['culture', 'tradition', 'custom', 'in China', 'Chinese people', '文化', '传统']
    const grammar = ['grammar', 'pattern', 'structure', 'rule', '语法', '句型']

    let messageType: Message['messageType'] = 'normal'
    let suggestions: string[] = []

    // Determine message type
    if (corrections.some(word => content.toLowerCase().includes(word))) {
      messageType = 'correction'
      suggestions = [
        "Can you explain why?",
        "Let me try again",
        "Give me another example",
        "Show me the pattern"
      ]
    } else if (encouragement.some(word => content.toLowerCase().includes(word))) {
      messageType = 'encouragement'
      suggestions = [
        "What's next?",
        "Give me something harder",
        "Let's practice more",
        "Teach me something new"
      ]
    } else if (cultural.some(word => content.toLowerCase().includes(word))) {
      messageType = 'cultural'
      suggestions = [
        "Tell me more about this",
        "How is this different in the West?",
        "Give me an example",
        "Is this common in China?"
      ]
    } else if (grammar.some(word => content.toLowerCase().includes(word))) {
      messageType = 'grammar'
      suggestions = [
        "Show me more examples",
        "What are the exceptions?",
        "Let's practice this pattern",
        "How do I remember this?"
      ]
    } else {
      // Generate contextual suggestions based on user level and content
      const hasChineseText = /[\u4e00-\u9fff]/.test(content)
      
      if (hasChineseText) {
        suggestions = [
          "How do I pronounce this?",
          "What does this mean exactly?",
          "Use this in a sentence",
          "Is this formal or casual?"
        ]
      } else {
        suggestions = [
          "Can you repeat that in Chinese?",
          "Show me the characters",
          "Let's practice this topic",
          "Ask me to try"
        ]
      }

      // Level-specific suggestions
      if (userLevel) {
        if (userLevel.level === 'beginner') {
          suggestions.push("Break this down for me", "Start with basics")
        } else if (userLevel.level === 'advanced') {
          suggestions.push("Give me harder examples", "What's the nuance?")
        }
      }
    }

    return { messageType, suggestions: suggestions.slice(0, 3) }
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

  const calculateComplexity = (text: string): number => {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const wordCount = text.split(/\s+/).length
    const hasComplexStructure = /[，。！？；：]/.test(text)

    let score = 0
    if (chineseChars > 0) score += Math.min(chineseChars / COMPLEXITY_SCORING.CHARS_PER_POINT, COMPLEXITY_SCORING.MAX_CHAR_POINTS)
    if (wordCount > COMPLEXITY_SCORING.WORD_COUNT_THRESHOLD) score += 1
    if (hasComplexStructure) score += COMPLEXITY_SCORING.COMPLEX_STRUCTURE_BONUS

    return Math.min(score, COMPLEXITY_SCORING.MAX_SCORE)
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

  const determineStrengths = useCallback((successRate: number, complexity: number): string[] => {
    const strengths = []
    if (successRate > SUCCESS_THRESHOLDS.GOOD) strengths.push('Good comprehension')
    if (complexity > COMPLEXITY_SCORING.MAX_CHAR_POINTS + 2) strengths.push('Complex sentence structure')
    if (wordsLearned.size > VOCAB_THRESHOLDS.GROWING) strengths.push('Growing vocabulary')
    return strengths
  }, [wordsLearned.size])

  const determineWeaknesses = useCallback((errors: number, successRate: number): string[] => {
    const weaknesses = []
    if (errors > ERROR_THRESHOLDS.HIGH_ERRORS) weaknesses.push('Grammar accuracy')
    if (successRate < SUCCESS_THRESHOLDS.POOR) weaknesses.push('Overall fluency')
    if (wordsLearned.size < VOCAB_THRESHOLDS.LIMITED) weaknesses.push('Limited vocabulary')
    return weaknesses
  }, [wordsLearned.size])

  const updateUserLevel = useCallback((complexity: number, errors: number) => {
    const totalInteractions = successfulResponses + errorCount
    if (totalInteractions < LEVEL_ASSESSMENT.MIN_INTERACTIONS) return // Need more data

    const successRate = totalInteractions > 0 ? successfulResponses / totalInteractions : 0
    const avgComplexity = complexity

    let level: UserLevel['level'] = 'beginner'
    let hskLevel = LEVEL_ASSESSMENT.HSK_BEGINNER
    let confidence = 0.5

    if (successRate > LEVEL_ASSESSMENT.SUCCESS_RATE_ADVANCED && avgComplexity > LEVEL_ASSESSMENT.COMPLEXITY_ADVANCED) {
      level = 'advanced'
      hskLevel = LEVEL_ASSESSMENT.HSK_ADVANCED
      confidence = 0.9
    } else if (successRate > LEVEL_ASSESSMENT.SUCCESS_RATE_INTERMEDIATE && avgComplexity > LEVEL_ASSESSMENT.COMPLEXITY_INTERMEDIATE) {
      level = 'intermediate'
      hskLevel = LEVEL_ASSESSMENT.HSK_INTERMEDIATE
      confidence = 0.8
    } else if (successRate > LEVEL_ASSESSMENT.SUCCESS_RATE_ELEMENTARY && avgComplexity > LEVEL_ASSESSMENT.COMPLEXITY_ELEMENTARY) {
      level = 'elementary'
      hskLevel = LEVEL_ASSESSMENT.HSK_ELEMENTARY
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
    setItemSafe(STORAGE_KEYS.LEVEL, newLevel)
    generateRecommendations(newLevel)
  }, [successfulResponses, errorCount, determineStrengths, determineWeaknesses])

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
  }, [updateUserLevel])

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
    const savedStreak = getItemSafe<string>(STORAGE_KEYS.STREAK)
    const savedLastPractice = getItemSafe<string>(STORAGE_KEYS.LAST_PRACTICE)
    const savedTopics = getItemSafe<string[]>(STORAGE_KEYS.TOPICS)
    const savedWords = getItemSafe<string[]>(STORAGE_KEYS.WORDS)
    const savedLevel = getItemSafe<UserLevel>(STORAGE_KEYS.LEVEL)
    const savedMessages = getItemSafe<(Message & { timestamp: string })[]>(STORAGE_KEYS.MESSAGES)

    // Load streak data
    if (savedStreak) {
      setDailyStreak(parseInt(savedStreak, 10) || 0)
    }
    if (savedLastPractice) {
      setLastPracticeDate(savedLastPractice)
    }

    // Load conversation topics
    if (savedTopics && Array.isArray(savedTopics)) {
      setConversationTopics(savedTopics)
    }

    // Generate initial conversation starters
    setConversationStarters(generateConversationStarters(userLevel))

    if (savedWords && Array.isArray(savedWords)) {
      setWordsLearned(new Set(savedWords))
    }

    if (savedLevel) {
      savedLevel.lastAssessed = new Date(savedLevel.lastAssessed)
      setUserLevel(savedLevel)
      generateRecommendations(savedLevel)
    } else {
      // Show level assessment for new users
      setTimeout(() => setShowLevelAssessment(true), UI_TIMEOUTS.LEVEL_ASSESSMENT_DELAY)
    }

    if (savedMessages && Array.isArray(savedMessages)) {
      const parsedMessages = savedMessages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
      setMessages(parsedMessages)
      // Track words from loaded messages
      parsedMessages.forEach((msg: Message) => {
        if (!msg.isUser) trackLearnedWords(msg.content)
      })
      return
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

  // Sync messages ref with state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Sync input ref with state
  useEffect(() => {
    inputRef.current = input
  }, [input])

  // Debounced localStorage save functions
  const debouncedSaveMessages = useMemo(
    () => debounce((msgs: Message[]) => {
      const truncated = truncateMessages(msgs, STORAGE_CONFIG.MAX_MESSAGES_STORED)
      setItemSafe(STORAGE_KEYS.MESSAGES, truncated)
    }, STORAGE_CONFIG.DEBOUNCE_DELAY),
    []
  )

  const debouncedSaveWords = useMemo(
    () => debounce((words: Set<string>) => {
      setItemSafe(STORAGE_KEYS.WORDS, [...words])
    }, STORAGE_CONFIG.DEBOUNCE_DELAY),
    []
  )

  // Save messages to localStorage whenever messages change (debounced)
  useEffect(() => {
    if (messages.length > 0) {
      debouncedSaveMessages(messages)
    }
  }, [messages, debouncedSaveMessages])

  // Save learned words to localStorage (debounced)
  useEffect(() => {
    if (wordsLearned.size > 0) {
      debouncedSaveWords(wordsLearned)
    }
  }, [wordsLearned, debouncedSaveWords])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    // Validate and sanitize input
    const validation = validateAndSanitizeMessage(input, INPUT_CONSTRAINTS.MAX_MESSAGE_LENGTH)

    if (!validation.valid) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: validation.error || 'Invalid message',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }

    const sanitizedInput = validation.sanitized

    const userMessage: Message = {
      id: Date.now().toString(),
      content: sanitizedInput,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Show typing indicator with natural delay
    setIsTyping(true)

    try {
      const data = await fetchJsonWithRetry<{ response: string; error?: string }>(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: sanitizedInput, messages: messagesRef.current })
        },
        {
          maxRetries: API_CONFIG.RETRY_ATTEMPTS,
          initialDelay: API_CONFIG.RETRY_INITIAL_DELAY,
          retryableStatusCodes: API_CONFIG.RETRYABLE_STATUS_CODES
        }
      )

      if (data.error) {
        throw new Error(data.error)
      }

      const responseContent = data.response || 'Sorry, I didn\'t receive a proper response. Please try again.'
      const messageAnalysis = analyzeMessageContent(responseContent, userLevel)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        isUser: false,
        timestamp: new Date(),
        messageType: messageAnalysis.messageType,
        suggestions: messageAnalysis.suggestions
      }

      // Track learned words from AI response
      trackLearnedWords(aiMessage.content)
      
      // Track conversation topics
      trackConversationTopics(userMessage.content)
      trackConversationTopics(aiMessage.content)
      
      // Analyze user level based on conversation
      analyzeUserLevel(userMessage.content, aiMessage.content)
      
      // Update daily practice streak
      updateDailyStreak()
      
      // Generate quick replies for the next interaction
      setQuickReplies(generateQuickReplies(responseContent))
      
      // Update conversation starters based on new level
      if (userLevel) {
        setConversationStarters(generateConversationStarters(userLevel))
      }
      
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
      setIsTyping(false)
    }
  }, [input, isLoading, analyzeUserLevel, updateDailyStreak, userLevel])

  const clearChat = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      content: 'Hello! I\'m your friendly Chinese tutor. I\'m here to help you learn Chinese through natural conversation. I\'ll teach you using English explanations, then show you the Chinese characters with pinyin pronunciation.\n\nLet\'s start simple - try saying hello to me in English, and I\'ll show you how to say it in Chinese! 😊',
      isUser: false,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    localStorage.removeItem(STORAGE_KEYS.MESSAGES)
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

  const startVoicePracticeMode = () => {
    setInput(`I'd like to practice speaking Chinese with you. Please give me some simple phrases to say out loud and repeat back. Focus on pronunciation and help me improve my speaking skills.`)
  }

  // Help restart conversations when they stall
  const restartConversation = () => {
    const restartPrompts = [
      "Let's try a different topic",
      "Can we start fresh with something new?",
      "I'd like to practice something else",
      "What should we talk about now?",
      "Give me a new challenge"
    ]
    const randomPrompt = restartPrompts[Math.floor(Math.random() * restartPrompts.length)]
    setInput(randomPrompt)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  // Track conversation topics for context
  // Generate conversation starters based on user level
  const generateConversationStarters = (level: UserLevel | null) => {
    const beginnerStarters = [
      "Hello, how are you?",
      "I want to learn greetings",
      "How do I say my name?",
      "What's the weather like?",
      "I'm hungry"
    ]
    
    const intermediateStarters = [
      "Tell me about Chinese festivals",
      "How do I order food in a restaurant?",
      "What's your favorite hobby?",
      "Describe your typical day",
      "Let's talk about travel"
    ]
    
    const advancedStarters = [
      "What are the cultural differences between East and West?",
      "Explain the philosophy behind Chinese idioms",
      "Discuss current events in China",
      "What's changing in modern Chinese society?",
      "Let's debate something interesting"
    ]

    if (!level) return beginnerStarters.slice(0, 3)
    
    switch (level.level) {
      case 'advanced':
        return advancedStarters.slice(0, 3)
      case 'intermediate':
        return intermediateStarters.slice(0, 3)
      default:
        return beginnerStarters.slice(0, 3)
    }
  }

  // Generate quick replies for natural conversation flow
  const generateQuickReplies = (lastMessage: string) => {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who']
    const isQuestion = questionWords.some(word => lastMessage.toLowerCase().includes(word)) || lastMessage.includes('?')
    
    if (isQuestion) {
      return [
        "I don't know, can you teach me?",
        "That's interesting, tell me more",
        "I'm not sure, show me how"
      ]
    }
    
    const hasChineseText = /[\u4e00-\u9fff]/.test(lastMessage)
    if (hasChineseText) {
      return [
        "Can you repeat that slower?",
        "How do you write that?",
        "What's the tone for that?"
      ]
    }
    
    return [
      "That's helpful, what else?",
      "I understand, continue please",
      "Can you give me an example?"
    ]
  }

  const trackConversationTopics = (content: string) => {
    const topicKeywords = [
      'food', 'restaurant', 'eat', '吃', '食物', '餐厅',
      'shopping', 'buy', 'store', '买', '购物', '商店', 
      'family', 'parents', 'children', '家人', '父母', '孩子',
      'work', 'job', 'office', '工作', '办公室',
      'travel', 'trip', 'vacation', '旅行', '度假',
      'weather', 'rain', 'sunny', '天气', '下雨', '晴天',
      'hobby', 'music', 'movie', '爱好', '音乐', '电影',
      'school', 'study', 'learn', '学校', '学习'
    ]

    const detectedTopics = topicKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    )

    if (detectedTopics.length > 0) {
      setConversationTopics(prev => {
        const newTopics = [...new Set([...detectedTopics, ...prev])].slice(0, 5)
        setItemSafe(STORAGE_KEYS.TOPICS, newTopics)
        return newTopics
      })
    }
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
  }, [sendMessage, askForCorrection, askForExplanation])

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
      <div
        className="px-4 sm:px-6 py-3 border-b border-red-100 bg-gradient-to-r from-red-100/50 to-yellow-100/50"
        role="region"
        aria-label="Learning progress and statistics"
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-red-800 font-medium">Progress</span>
            <span
              className="bg-red-200 px-2 py-1 rounded-full text-red-800 font-medium"
              aria-label={`You have learned ${wordsLearned.size} words`}
            >
              {wordsLearned.size} words learned
            </span>
            {dailyStreak > 0 && (
              <span
                className="bg-orange-200 px-2 py-1 rounded-full text-orange-800 font-medium"
                aria-label={`${dailyStreak} day practice streak`}
              >
                🔥 {dailyStreak} day streak
              </span>
            )}
            {userLevel && (
              <span
                className="bg-blue-200 px-2 py-1 rounded-full text-blue-800 font-medium capitalize"
                aria-label={`Your level is ${userLevel.level}, HSK level ${userLevel.hskLevel}`}
              >
                {userLevel.level} • HSK {userLevel.hskLevel}
              </span>
            )}
          </div>
          {userLevel && (
            <div
              className="text-xs text-gray-600"
              aria-label={`Assessment confidence level ${Math.round(userLevel.confidence * 100)} percent`}
            >
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

      {/* Recent Topics bar */}
      {conversationTopics.length > 0 && (
        <div className="px-4 sm:px-6 py-2 border-b border-red-100 bg-gray-50/70">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700 font-medium">🔄 Recent:</span>
            <div className="flex gap-2 overflow-x-auto">
              {conversationTopics.slice(0, 3).map((topic, idx) => (
                <button
                  key={idx}
                  onClick={() => startTopicLesson(topic)}
                  className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Chat conversation"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSpeakChinese={speakChinese}
            onSuggestionClick={handleSuggestionClick}
          />
        ))}
        {(isLoading || isTyping) && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-900 max-w-xs lg:max-w-md px-4 py-3 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">Tutor is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-red-100 bg-white/50 backdrop-blur-sm p-4 sm:p-6">
        {/* Quick Replies for Natural Flow */}
        {quickReplies.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-600 font-medium">💬 Quick replies:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(reply)}
                  className="px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors border border-green-200 font-medium"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Starters for Empty State */}
        {messages.length <= 1 && conversationStarters.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-600 font-medium">🚀 Try saying:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {conversationStarters.map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(starter)}
                  className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors border border-blue-200 font-medium"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

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
          {speechSupported && (
            <button
              onClick={startVoicePracticeMode}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 rounded-full hover:from-orange-200 hover:to-orange-300 transition-all duration-200 shadow-sm border border-orange-300 font-medium"
            >
              🎙️ Voice Practice
            </button>
          )}
          <button
            onClick={restartConversation}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded-full hover:from-indigo-200 hover:to-indigo-300 transition-all duration-200 shadow-sm border border-indigo-300 font-medium"
          >
            🔄 New Topic
          </button>
          <button
            onClick={clearChat}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-full hover:from-red-200 hover:to-red-300 transition-all duration-200 shadow-sm border border-red-300 font-medium"
            title="Keyboard shortcut: Ctrl+L"
          >
            🗑️ Clear Chat
          </button>
        </div>
        
        <div className="flex space-x-1.5 sm:space-x-2" role="form" aria-label="Message input form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message, speak Chinese, or record..."
            className="flex-1 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 bg-white shadow-sm font-medium text-sm sm:text-base"
            disabled={isLoading}
            maxLength={INPUT_CONSTRAINTS.MAX_MESSAGE_LENGTH}
            aria-label="Type your message to the Chinese tutor"
            aria-describedby="input-hint"
          />
          <span id="input-hint" className="sr-only">
            Press Enter to send, or use voice recording
          </span>
          {speechSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm font-medium text-sm sm:text-base ${
                isListening
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-300'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 focus:ring-purple-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop recording voice message' : 'Start recording voice message'}
              title={isListening ? 'Stop recording (speak now!)' : 'Record voice message'}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm font-medium text-sm sm:text-base"
            aria-label="Send message"
            title="Keyboard shortcut: Ctrl+Enter"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}