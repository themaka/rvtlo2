import { memo, useEffect } from 'react'
import { ErrorSeverity, ErrorCategory, formatErrorForUser, type AppError } from '../utils/errorHandling'

interface ErrorMessageProps {
  error?: AppError | string | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showDetails?: boolean
}

/**
 * Standardized error message component with consistent styling and behavior
 */
export const ErrorMessage = memo(function ErrorMessage({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '', 
  showDetails = false 
}: ErrorMessageProps) {
  if (!error) {
    return null
  }

  // Handle string errors (legacy support)
  if (typeof error === 'string') {
    return (
      <div className={`error-message ${className}`}>
        <div className="error-content">
          <i className="error-icon">⚠️</i>
          <span className="error-text">{error}</span>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="error-dismiss"
            type="button"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  // Handle AppError objects
  const formattedError = formatErrorForUser(error)
  const severityClass = `error-${error.severity}`
  const categoryIcon = getCategoryIcon(error.category)

  return (
    <div className={`error-message ${severityClass} ${className}`}>
      <div className="error-content">
        <div className="error-header">
          <i className="error-icon">{categoryIcon}</i>
          <div className="error-title-section">
            <h4 className="error-title">{formattedError.title}</h4>
            <p className="error-description">{formattedError.message}</p>
          </div>
        </div>

        {formattedError.suggestions.length > 0 && (
          <div className="error-suggestions">
            <p className="suggestions-title">Try these steps:</p>
            <ul className="suggestions-list">
              {formattedError.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {showDetails && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <div className="error-technical">
              <p><strong>Error ID:</strong> {error.id}</p>
              <p><strong>Category:</strong> {error.category}</p>
              <p><strong>Severity:</strong> {error.severity}</p>
              <p><strong>Timestamp:</strong> {new Date(error.timestamp).toLocaleString()}</p>
              {error.originalError && (
                <p><strong>Details:</strong> {error.originalError.message}</p>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="error-actions">
        {formattedError.canRetry && onRetry && (
          <button 
            onClick={onRetry}
            className="button-secondary error-retry"
            type="button"
          >
            Try Again
          </button>
        )}
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="error-dismiss"
            type="button"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
})

/**
 * Inline field error component for form validation
 */
interface FieldErrorProps {
  error?: string | null
  fieldName?: string
  className?: string
}

export const FieldError = memo(function FieldError({ error, fieldName, className = '' }: FieldErrorProps) {
  if (!error) {
    return null
  }

  return (
    <div className={`field-error ${className}`} role="alert">
      <i className="field-error-icon">⚠️</i>
      <span className="field-error-text">
        {fieldName && <strong>{fieldName}: </strong>}
        {error}
      </span>
    </div>
  )
})

/**
 * Toast-style notification for temporary errors
 */
interface ErrorToastProps {
  error: AppError | string
  onDismiss: () => void
  autoHideDuration?: number
}

export const ErrorToast = memo(function ErrorToast({ error, onDismiss, autoHideDuration = 5000 }: ErrorToastProps) {
  // Auto-hide after specified duration with cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, autoHideDuration)

    // Cleanup timer on unmount or dependency change
    return () => clearTimeout(timer)
  }, [onDismiss, autoHideDuration])

  const isStringError = typeof error === 'string'
  const severity = isStringError ? ErrorSeverity.MEDIUM : error.severity
  
  return (
    <div className={`error-toast error-${severity}`}>
      <div className="error-toast-content">
        <i className="error-toast-icon">
          {isStringError ? '⚠️' : getCategoryIcon(error.category)}
        </i>
        <span className="error-toast-text">
          {isStringError ? error : error.userMessage}
        </span>
      </div>
      <button 
        onClick={onDismiss}
        className="error-toast-dismiss"
        type="button"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
})

/**
 * Error banner for top-level application errors
 */
interface ErrorBannerProps {
  error: AppError
  onRetry?: () => void
  onDismiss?: () => void
}

export const ErrorBanner = memo(function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  const formattedError = formatErrorForUser(error)
  
  return (
    <div className={`error-banner error-${error.severity}`}>
      <div className="error-banner-content">
        <i className="error-banner-icon">{getCategoryIcon(error.category)}</i>
        <div className="error-banner-text">
          <strong>{formattedError.title}:</strong> {formattedError.message}
        </div>
        <div className="error-banner-actions">
          {formattedError.canRetry && onRetry && (
            <button onClick={onRetry} className="button-sm button-secondary">
              Retry
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="error-banner-dismiss" type="button">
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * Get appropriate icon for error category
 */
function getCategoryIcon(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return '🌐'
    case ErrorCategory.API:
      return '🔌'
    case ErrorCategory.VALIDATION:
      return '📝'
    case ErrorCategory.PERMISSION:
      return '🔒'
    case ErrorCategory.TIMEOUT:
      return '⏱️'
    case ErrorCategory.DATA:
      return '📊'
    case ErrorCategory.UI:
      return '🖥️'
    default:
      return '⚠️'
  }
}

export default ErrorMessage