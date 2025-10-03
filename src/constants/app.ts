// Application-wide constants

// API Configuration
export const API_CONFIG = {
  MAX_TOKENS: 1000,
  MODEL: 'claude-3-5-sonnet-20241022',
  MAX_HISTORY_MESSAGES: 20,
  RETRY_ATTEMPTS: 3,
  RETRY_INITIAL_DELAY: 1000,
  RETRYABLE_STATUS_CODES: [408, 429, 500, 502, 503, 504]
} as const

// Rate Limiting
export const RATE_LIMIT = {
  WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS: 20
} as const

// Input Validation
export const INPUT_CONSTRAINTS = {
  MAX_MESSAGE_LENGTH: 500,
  MIN_MESSAGE_LENGTH: 1
} as const

// Storage Configuration
export const STORAGE_CONFIG = {
  MAX_MESSAGES_STORED: 100,
  QUOTA_MB: 5,
  DEBOUNCE_DELAY: 1000
} as const

// User Level Assessment
export const LEVEL_ASSESSMENT = {
  MIN_INTERACTIONS: 3,
  SUCCESS_RATE_ADVANCED: 0.8,
  SUCCESS_RATE_INTERMEDIATE: 0.6,
  SUCCESS_RATE_ELEMENTARY: 0.4,
  COMPLEXITY_ADVANCED: 6,
  COMPLEXITY_INTERMEDIATE: 4,
  COMPLEXITY_ELEMENTARY: 2,
  HSK_ADVANCED: 5,
  HSK_INTERMEDIATE: 3,
  HSK_ELEMENTARY: 2,
  HSK_BEGINNER: 1
} as const

// Speech Recognition
export const SPEECH_CONFIG = {
  LANG: 'zh-CN',
  RATE: 0.8,
  CONTINUOUS: false,
  INTERIM_RESULTS: false
} as const

// UI Timeouts
export const UI_TIMEOUTS = {
  LEVEL_ASSESSMENT_DELAY: 3000,
  TYPING_INDICATOR_MIN: 500
} as const

// LocalStorage Keys
export const STORAGE_KEYS = {
  MESSAGES: 'chinese-tutor-messages',
  WORDS: 'chinese-tutor-words',
  LEVEL: 'chinese-tutor-level',
  STREAK: 'chinese-tutor-streak',
  LAST_PRACTICE: 'chinese-tutor-last-practice',
  TOPICS: 'chinese-tutor-topics'
} as const

// Vocabulary Tracking
export const VOCAB_THRESHOLDS = {
  GROWING: 20,
  LIMITED: 10
} as const

// Error Detection
export const ERROR_THRESHOLDS = {
  HIGH_ERRORS: 3
} as const

// Success Rate Thresholds
export const SUCCESS_THRESHOLDS = {
  GOOD: 0.7,
  POOR: 0.5
} as const

// Conversation Complexity
export const COMPLEXITY_SCORING = {
  MAX_SCORE: 10,
  CHARS_PER_POINT: 5,
  MAX_CHAR_POINTS: 3,
  WORD_COUNT_THRESHOLD: 10,
  COMPLEX_STRUCTURE_BONUS: 2
} as const
