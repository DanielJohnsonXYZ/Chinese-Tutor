import { memo } from 'react'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  messageType?: 'normal' | 'correction' | 'encouragement' | 'cultural' | 'grammar'
  suggestions?: string[]
}

interface MessageBubbleProps {
  message: Message
  onSpeakChinese: (text: string) => void
  onSuggestionClick: (suggestion: string) => void
}

function MessageBubble({ message, onSpeakChinese, onSuggestionClick }: MessageBubbleProps) {
  const getMessageStyle = () => {
    if (message.isUser) {
      return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
    }

    switch (message.messageType) {
      case 'correction':
        return 'bg-gradient-to-r from-red-50 to-orange-50 text-gray-800 border border-red-200'
      case 'encouragement':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 text-gray-800 border border-green-200'
      case 'cultural':
        return 'bg-gradient-to-r from-purple-50 to-violet-50 text-gray-800 border border-purple-200'
      case 'grammar':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-800 border border-blue-200'
      default:
        return 'bg-white text-gray-800 border border-gray-200'
    }
  }

  const getMessageIcon = () => {
    switch (message.messageType) {
      case 'correction': return '✏️'
      case 'encouragement': return '🎉'
      case 'cultural': return '🏮'
      case 'grammar': return '📝'
      default: return '🤖'
    }
  }

  return (
    <div className="space-y-2">
      <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[280px] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-xl shadow-sm ${getMessageStyle()}`}>
          {!message.isUser && message.messageType !== 'normal' && (
            <div className="flex items-center gap-1 mb-2 text-xs font-medium opacity-80">
              <span>{getMessageIcon()}</span>
              <span className="capitalize">{message.messageType}</span>
            </div>
          )}
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
                            onClick={() => onSpeakChinese(chineseOnly)}
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

      {/* Smart Follow-up Suggestions */}
      {!message.isUser && message.suggestions && message.suggestions.length > 0 && (
        <div className="flex justify-start">
          <div className="max-w-[280px] sm:max-w-xs lg:max-w-md ml-2">
            <div className="flex flex-wrap gap-1.5">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="px-2.5 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors border border-blue-200 font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(MessageBubble, (prevProps, nextProps) => {
  // Only re-render if message content changes
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.messageType === nextProps.message.messageType
  )
})
