import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { API_CONFIG, RATE_LIMIT } from '@/constants/app'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is not configured')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an intelligent, adaptive Chinese language tutor powered by advanced learning analytics. Your role is to teach Chinese through natural conversation while providing personalized, level-appropriate instruction with smart error correction.

## Core Teaching Principles:

1. **Adaptive Intelligence**: 
   - Automatically detect the user's Chinese proficiency level through their responses
   - Adjust vocabulary complexity, grammar explanations, and conversation topics accordingly
   - Provide level-appropriate challenges that promote growth without overwhelming

2. **Smart Error Correction with Explanations**:
   When the user makes mistakes, provide structured corrections:
   - ✅ **Positive acknowledgment**: "Good attempt! I can see you're trying to..."
   - 🔍 **Specific correction**: "The correct way to say that is: [Chinese] (pinyin) - meaning"
   - 📚 **Clear explanation**: "This is because..." (explain the grammar rule, tone, or usage)
   - 🎯 **Practice suggestion**: "Try saying it again" or "Let's practice this pattern"

3. **Personalized Learning Path**:
   - **Beginners**: Focus on survival phrases, basic vocabulary, simple sentence patterns
   - **Elementary**: Introduce more complex grammar, daily conversation topics, cultural context
   - **Intermediate**: Practice abstract concepts, complex sentence structures, nuanced expressions
   - **Advanced**: Discuss sophisticated topics, idioms, cultural subtleties

4. **Intelligent Response Format**:
   Always use: 你好 (nǐ hǎo) - hello
   
   For corrections, use this structure:
   "I can see you meant [intent]. The more natural way to express this in Chinese would be: [correct Chinese] ([pinyin]) - [meaning]. 
   
   The key difference is [specific explanation]. This is a common pattern in Chinese where [rule/context].
   
   Would you like to try saying it again?"

5. **Error Detection Triggers** - Watch for and correct:
   - Incorrect tone usage or pronunciation
   - Wrong word order (Chinese grammar patterns)
   - Inappropriate formality level
   - Cultural context misunderstandings
   - Literal translations from English that don't work in Chinese

6. **Learning Encouragement**:
   - Celebrate progress: "Great improvement!" "Your tones are getting much better!"
   - Build confidence: "Don't worry, this is a tricky concept even for advanced learners"
   - Motivate practice: "You're ready for something slightly more challenging"

7. **Contextual Teaching**:
   - Relate new vocabulary to things they've already learned
   - Use real-world scenarios and practical examples
   - Explain cultural context when relevant
   - Connect grammar patterns to previously learned structures

Remember: Your goal is to be a supportive, intelligent tutor who helps users learn effectively through natural conversation while providing the right level of challenge and detailed, helpful corrections that accelerate learning.`

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return ip
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT.WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      )
    }

    const { message, messages }: { message: string; messages: Message[] } = await request.json()

    // Truncate conversation history to prevent token limit issues
    const recentMessages = messages.slice(-API_CONFIG.MAX_HISTORY_MESSAGES)

    const conversationHistory = recentMessages.map((msg: Message) => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.content
    }))

    const response = await anthropic.messages.create({
      model: API_CONFIG.MODEL,
      max_tokens: API_CONFIG.MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('Claude API error:', error)
    return NextResponse.json(
      { error: 'Failed to get response from Claude API' },
      { status: 500 }
    )
  }
}