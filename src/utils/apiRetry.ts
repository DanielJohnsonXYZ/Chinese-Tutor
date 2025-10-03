// API retry utility with exponential backoff

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableStatusCodes?: number[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function shouldRetry(status: number, retryableStatusCodes: number[]): boolean {
  return retryableStatusCodes.includes(status)
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...retryOptions }
  let lastError: Error | null = null
  let currentDelay = config.initialDelay

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // If successful or non-retryable error, return response
      if (response.ok || !shouldRetry(response.status, config.retryableStatusCodes)) {
        return response
      }

      // Store the response as an error for last attempt
      if (attempt === config.maxRetries) {
        return response // Return the failed response on last attempt
      }

      // Wait before retrying
      console.log(`Request failed with status ${response.status}, retrying in ${currentDelay}ms (attempt ${attempt + 1}/${config.maxRetries})`)
      await delay(currentDelay)

      // Exponential backoff
      currentDelay = Math.min(currentDelay * config.backoffMultiplier, config.maxDelay)

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      // If this is the last attempt, throw the error
      if (attempt === config.maxRetries) {
        throw lastError
      }

      // Network errors are always retryable
      console.log(`Network error: ${lastError.message}, retrying in ${currentDelay}ms (attempt ${attempt + 1}/${config.maxRetries})`)
      await delay(currentDelay)

      // Exponential backoff
      currentDelay = Math.min(currentDelay * config.backoffMultiplier, config.maxDelay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Max retries exceeded')
}

// Convenience function for JSON API calls
export async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json() as Promise<T>
}
