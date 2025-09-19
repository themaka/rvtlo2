import type { ErrorInfo } from 'react'

/**
 * Error severity levels for classification and prioritization
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity]

/**
 * Error categories for better classification and handling
 */
export const ErrorCategory = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  API: 'api',
  UI: 'ui',
  DATA: 'data',
  PERMISSION: 'permission',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
} as const

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory]

/**
 * Standardized error object structure
 */
export interface AppError {
  id: string
  message: string
  userMessage: string
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: string
  context?: Record<string, unknown>
  originalError?: Error
  stack?: string
  recoverable: boolean
  retryable: boolean
}

/**
 * Error logging interface for potential external services
 */
export interface ErrorLogger {
  logError: (error: AppError) => void
  logWarning: (message: string, context?: Record<string, unknown>) => void
  logInfo: (message: string, context?: Record<string, unknown>) => void
}

/**
 * Default console logger implementation
 */
export const consoleLogger: ErrorLogger = {
  logError: (error: AppError) => {
    console.error(`[${error.severity.toUpperCase()}] ${error.category}:`, {
      id: error.id,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack
    })
  },
  logWarning: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARNING]:`, message, context)
  },
  logInfo: (message: string, context?: Record<string, unknown>) => {
    console.info(`[INFO]:`, message, context)
  }
}

/**
 * Generate unique error ID for tracking
 */
export function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Classify error based on error message and type
 */
export function classifyError(error: Error | string): { category: ErrorCategory; severity: ErrorSeverity } {
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerMessage = errorMessage.toLowerCase()

  // Network related errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM }
  }

  // API related errors
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
    return { category: ErrorCategory.PERMISSION, severity: ErrorSeverity.HIGH }
  }

  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden')) {
    return { category: ErrorCategory.PERMISSION, severity: ErrorSeverity.HIGH }
  }

  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return { category: ErrorCategory.API, severity: ErrorSeverity.MEDIUM }
  }

  if (lowerMessage.includes('500') || lowerMessage.includes('server error')) {
    return { category: ErrorCategory.API, severity: ErrorSeverity.HIGH }
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return { category: ErrorCategory.TIMEOUT, severity: ErrorSeverity.MEDIUM }
  }

  // Validation errors
  if (lowerMessage.includes('required') || lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW }
  }

  // Data errors
  if (lowerMessage.includes('parse') || lowerMessage.includes('format') || lowerMessage.includes('json')) {
    return { category: ErrorCategory.DATA, severity: ErrorSeverity.MEDIUM }
  }

  // Default classification
  return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.MEDIUM }
}

/**
 * Generate user-friendly error messages based on error category and context
 */
export function generateUserMessage(category: ErrorCategory, severity: ErrorSeverity): string {
  switch (category) {
    case ErrorCategory.VALIDATION:
      return 'Please check your input and try again.'
    
    case ErrorCategory.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.'
    
    case ErrorCategory.PERMISSION:
      if (severity === ErrorSeverity.HIGH) {
        return 'You don\'t have permission to perform this action. Please check your credentials.'
      }
      return 'Access denied. Please contact support if this continues.'
    
    case ErrorCategory.API:
      if (severity === ErrorSeverity.HIGH) {
        return 'Our servers are experiencing issues. Please try again in a few minutes.'
      }
      return 'We couldn\'t process your request right now. Please try again.'
    
    case ErrorCategory.TIMEOUT:
      return 'The request is taking longer than expected. Please try again.'
    
    case ErrorCategory.DATA:
      return 'There was an issue processing the data. Please try again or contact support.'
    
    case ErrorCategory.UI:
      return 'A display error occurred. Refreshing the page may help.'
    
    default:
      return 'An unexpected error occurred. Please try again or refresh the page.'
  }
}

/**
 * Create a standardized AppError from various error types
 */
export function createAppError(
  error: Error | string,
  context?: Record<string, unknown>,
  overrides?: Partial<AppError>
): AppError {
  const originalError = typeof error === 'string' ? new Error(error) : error
  const { category, severity } = classifyError(originalError)
  
  const appError: AppError = {
    id: generateErrorId(),
    message: originalError.message,
    userMessage: generateUserMessage(category, severity),
    category,
    severity,
    timestamp: new Date().toISOString(),
    context,
    originalError,
    stack: originalError.stack,
    recoverable: severity !== ErrorSeverity.CRITICAL,
    retryable: category === ErrorCategory.NETWORK || category === ErrorCategory.TIMEOUT || category === ErrorCategory.API,
    ...overrides
  }

  return appError
}

/**
 * Create error from React Error Boundary
 */
export function createReactError(
  error: Error,
  errorInfo: ErrorInfo,
  context?: Record<string, unknown>
): AppError {
  return createAppError(error, {
    componentStack: errorInfo.componentStack,
    errorBoundary: true,
    ...context
  }, {
    category: ErrorCategory.UI,
    severity: ErrorSeverity.HIGH,
    userMessage: 'A component error occurred. The page will be refreshed to recover.',
    recoverable: true,
    retryable: false
  })
}

/**
 * Error handling for async operations with automatic logging
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  context?: Record<string, unknown>,
  logger: ErrorLogger = consoleLogger
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const appError = createAppError(error as Error, context)
    logger.logError(appError)
    return { success: false, error: appError }
  }
}

/**
 * Error handling for synchronous operations with automatic logging
 */
export function handleSyncError<T>(
  operation: () => T,
  context?: Record<string, unknown>,
  logger: ErrorLogger = consoleLogger
): { success: true; data: T } | { success: false; error: AppError } {
  try {
    const data = operation()
    return { success: true, data }
  } catch (error) {
    const appError = createAppError(error as Error, context)
    logger.logError(appError)
    return { success: false, error: appError }
  }
}

/**
 * Check if an error is retryable based on its characteristics
 */
export function isRetryableError(error: AppError): boolean {
  return error.retryable && error.severity !== ErrorSeverity.CRITICAL
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: AppError): boolean {
  return error.recoverable
}

/**
 * Get recovery suggestions based on error type
 */
export function getRecoverySuggestions(error: AppError): string[] {
  const suggestions: string[] = []

  switch (error.category) {
    case ErrorCategory.NETWORK:
      suggestions.push('Check your internet connection')
      suggestions.push('Try refreshing the page')
      suggestions.push('Wait a moment and try again')
      break
    
    case ErrorCategory.VALIDATION:
      suggestions.push('Check your input for any errors')
      suggestions.push('Make sure all required fields are filled')
      suggestions.push('Verify the format of your entries')
      break
    
    case ErrorCategory.PERMISSION:
      suggestions.push('Make sure you\'re logged in')
      suggestions.push('Check if you have the necessary permissions')
      suggestions.push('Contact support if the issue persists')
      break
    
    case ErrorCategory.API:
      suggestions.push('Try again in a few minutes')
      suggestions.push('Refresh the page')
      suggestions.push('Contact support if the issue continues')
      break
    
    case ErrorCategory.TIMEOUT:
      suggestions.push('Check your internet connection')
      suggestions.push('Try again with a simpler request')
      suggestions.push('Wait a moment before retrying')
      break
    
    case ErrorCategory.UI:
      suggestions.push('Refresh the page')
      suggestions.push('Clear your browser cache')
      suggestions.push('Try using a different browser')
      break
    
    default:
      suggestions.push('Refresh the page')
      suggestions.push('Try again in a few minutes')
      suggestions.push('Contact support if the problem persists')
      break
  }

  if (error.retryable) {
    suggestions.unshift('Try the action again')
  }

  return suggestions
}

/**
 * Format error for display to users
 */
export function formatErrorForUser(error: AppError): {
  title: string
  message: string
  suggestions: string[]
  canRetry: boolean
  severity: ErrorSeverity
} {
  const title = error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' :
                 error.severity === ErrorSeverity.HIGH ? 'Error' :
                 error.severity === ErrorSeverity.MEDIUM ? 'Issue Encountered' :
                 'Minor Issue'

  return {
    title,
    message: error.userMessage,
    suggestions: getRecoverySuggestions(error),
    canRetry: error.retryable,
    severity: error.severity
  }
}

export default {
  createAppError,
  createReactError,
  handleAsyncError,
  handleSyncError,
  isRetryableError,
  isRecoverableError,
  formatErrorForUser,
  classifyError,
  generateUserMessage,
  generateErrorId,
  consoleLogger,
  ErrorSeverity,
  ErrorCategory
}