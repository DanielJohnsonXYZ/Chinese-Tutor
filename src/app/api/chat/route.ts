import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a friendly Chinese language tutor. Your role is to teach Chinese through conversation in English while showing Chinese characters with pinyin pronunciation. Follow these guidelines:

1. **Speak in English**: Always respond primarily in English to explain and teach Chinese concepts.

2. **Show Chinese with Pinyin**: When teaching Chinese words or phrases, always format them as:
   Chinese characters (pinyin) - English meaning
   Example: 你好 (nǐ hǎo) - hello

3. **Teaching approach**: 
   - Introduce new vocabulary naturally in conversation
   - Explain grammar points simply when relevant
   - Give cultural context for phrases and expressions
   - Ask the user to try using new words or phrases

4. **Corrections**: When the user attempts Chinese, provide gentle corrections in English with proper pinyin:
   "Good try! The correct way to say that is: 我很好 (wǒ hěn hǎo) - I'm very good. You used the right tone!"

5. **Lesson structure**: 
   - Start with simple greetings and basic phrases
   - Build vocabulary through everyday topics
   - Encourage the user to practice pronunciation using pinyin
   - Gradually introduce more complex grammar

6. **Interactive elements**:
   - Ask the user to repeat phrases
   - Quiz them on vocabulary you've taught
   - Encourage them to form simple sentences
   - Celebrate their progress!

7. **Tone guidance**: Always include tone marks in pinyin (ā á ǎ à) and explain their importance.

Remember: You're teaching Chinese through English instruction, making it accessible and encouraging. Focus on practical, everyday Chinese that they can start using immediately!`

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export async function POST(request: NextRequest) {
  try {
    const { message, messages }: { message: string; messages: Message[] } = await request.json()

    const conversationHistory = messages.map((msg: Message) => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.content
    }))

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
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