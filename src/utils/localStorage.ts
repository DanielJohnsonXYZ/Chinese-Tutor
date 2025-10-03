// localStorage utility with quota protection and debouncing

const STORAGE_QUOTA_MB = 5 // Conservative estimate (5MB)
const MAX_MESSAGES_STORED = 100 // Limit message history

interface StorageItem<T> {
  data: T
  timestamp: number
}

export function setItemSafe<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value)
    const sizeInBytes = new Blob([serialized]).size
    const sizeInMB = sizeInBytes / (1024 * 1024)

    // Check if item is too large
    if (sizeInMB > STORAGE_QUOTA_MB) {
      console.warn(`Item too large for localStorage: ${sizeInMB.toFixed(2)}MB`)
      return false
    }

    localStorage.setItem(key, serialized)
    return true
  } catch (error) {
    // Handle QuotaExceededError
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded')
      // Try to clear old data
      clearOldestData()
      // Retry once
      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (retryError) {
        console.error('Failed to save to localStorage after cleanup:', retryError)
        return false
      }
    }
    console.error('Error saving to localStorage:', error)
    return false
  }
}

export function getItemSafe<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue || null
    return JSON.parse(item) as T
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return defaultValue || null
  }
}

export function clearOldestData(): void {
  // Clear data based on priority (oldest first, least important first)
  const keysToCheck = [
    'chinese-tutor-messages',
    'chinese-tutor-topics',
    'chinese-tutor-words'
  ]

  for (const key of keysToCheck) {
    try {
      localStorage.removeItem(key)
      console.log(`Cleared ${key} to free up space`)
      break // Try one at a time
    } catch (error) {
      console.error(`Failed to clear ${key}:`, error)
    }
  }
}

// Debounce function for localStorage writes
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

// Truncate message array to prevent excessive storage
export function truncateMessages<T>(messages: T[], maxLength: number = MAX_MESSAGES_STORED): T[] {
  if (messages.length <= maxLength) {
    return messages
  }
  // Keep the most recent messages
  return messages.slice(-maxLength)
}

// Check available storage space (rough estimate)
export function getStorageInfo(): { used: number; available: number } {
  let used = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          used += new Blob([value]).size
        }
      }
    }
  } catch (error) {
    console.error('Error calculating storage usage:', error)
  }

  const usedMB = used / (1024 * 1024)
  const availableMB = STORAGE_QUOTA_MB - usedMB

  return {
    used: usedMB,
    available: Math.max(0, availableMB)
  }
}
