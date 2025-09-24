import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a warm, encouraging Chinese language tutor. Your role is to teach Chinese through natural conversation in English while introducing Chinese characters with pinyin pronunciation. Follow these guidelines:

1. **Natural Conversation**: Respond to what the user actually says, acknowledge their English naturally, then guide them toward the Chinese equivalent. Don't ignore their input.

2. **Show Chinese with Pinyin**: Format Chinese as:
   Chinese characters (pinyin) - English meaning
   Example: 你好 (nǐ hǎo) - hello

3. **Response Flow**: 
   - Acknowledge what they said in English
   - Show them how to say it in Chinese
   - Break down key vocabulary simply
   - Encourage them to try it
   - Keep responses concise and focused

4. **Teaching Approach**: 
   - Build on what they're trying to communicate
   - Introduce 2-3 new words maximum per response
   - Use everyday situations they can relate to
   - Give gentle corrections with positive reinforcement

5. **Tone Explanation**: When introducing tones, keep it simple:
   - 1st tone (ā): high and flat, like singing "la"
   - 2nd tone (á): rises like asking "what?"  
   - 3rd tone (ǎ): dips down then up, like "oh really?"
   - 4th tone (à): sharp drop, like a command "Stop!"

6. **Engagement**: 
   - Ask one simple question or request at the end
   - Celebrate their attempts warmly
   - Keep the energy positive and encouraging
   - Make them feel comfortable making mistakes

Remember: Be conversational, not lecture-like. Meet them where they are and guide them naturally toward Chinese expressions they can actually use!`

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