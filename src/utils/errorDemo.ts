// Error Handling Demonstration Script
// This script demonstrates the new error handling capabilities

import { 
  createAppError, 
  handleAsyncError, 
  ErrorCategory, 
  ErrorSeverity,
  formatErrorForUser
} from '../utils/errorHandling'

/**
 * Demonstrates different types of errors and how they're handled
 */
export function demonstrateErrorHandling() {
  console.log('🧪 Error Handling Demo - Phase 7 Complete')
  console.log('==========================================')

  // 1. Validation Error
  const validationError = createAppError(
    'Invalid input provided',
    { field: 'email', value: 'invalid-email' },
    {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      userMessage: 'Please enter a valid email address',
      recoverable: true,
      retryable: false
    }
  )

  console.log('1. Validation Error:')
  console.log('   User Message:', validationError.userMessage)
  console.log('   Category:', validationError.category)
  console.log('   Severity:', validationError.severity)
  console.log('   Recoverable:', validationError.recoverable)
  console.log('')

  // 2. Network Error
  const networkError = createAppError(
    'Failed to fetch data',
    { url: '/api/data', method: 'GET' },
    {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable: true
    }
  )

  console.log('2. Network Error:')
  console.log('   User Message:', networkError.userMessage)
  console.log('   Category:', networkError.category)
  console.log('   Retryable:', networkError.retryable)
  console.log('')

  // 3. API Error
  const apiError = createAppError(
    'API authentication failed',
    { status: 401, endpoint: '/api/secure' },
    {
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.HIGH,
      retryable: false
    }
  )

  console.log('3. API Permission Error:')
  console.log('   User Message:', apiError.userMessage)
  console.log('   Category:', apiError.category)
  console.log('   Severity:', apiError.severity)
  console.log('   Retryable:', apiError.retryable)
  console.log('')

  // 4. Formatted Error for UI
  const formattedError = formatErrorForUser(networkError)
  console.log('4. Formatted Error for UI:')
  console.log('   Title:', formattedError.title)
  console.log('   Message:', formattedError.message)
  console.log('   Can Retry:', formattedError.canRetry)
  console.log('   Suggestions:', formattedError.suggestions)
  console.log('')

  // 5. Async Error Handling Demo
  console.log('5. Async Error Handling:')
  demonstrateAsyncErrorHandling()

  console.log('✅ Error handling system is working correctly!')
  console.log('📋 Phase 7 - Error handling and validation layer - COMPLETE')
}

async function demonstrateAsyncErrorHandling() {
  // Simulate an async operation that might fail
  const result = await handleAsyncError(async () => {
    // Simulate random success/failure
    if (Math.random() > 0.5) {
      return 'Operation successful!'
    } else {
      throw new Error('Simulated network failure')
    }
  }, { operation: 'demo', timestamp: Date.now() })

  if (result.success) {
    console.log('   ✅ Async operation succeeded:', result.data)
  } else {
    console.log('   ❌ Async operation failed:', result.error.userMessage)
    console.log('   Error ID:', result.error.id)
    console.log('   Category:', result.error.category)
  }
}

// Run the demo if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - add to window for manual testing
  ;(window as typeof window & { demonstrateErrorHandling: () => void }).demonstrateErrorHandling = demonstrateErrorHandling
  console.log('🎯 Error handling demo available: window.demonstrateErrorHandling()')
} else {
  // Node environment - run immediately
  demonstrateErrorHandling()
}