import { useState, useCallback } from 'react'
import { FieldError } from './ErrorMessage'
import { getFieldValidationState } from '../utils/validation'

interface ValidatedInputProps {
  value: string
  onChange: (value: string) => void
  onValidation?: (isValid: boolean, error?: string) => void
  validator?: (value: string) => { isValid: boolean; error?: string }
  placeholder?: string
  label: string
  minLength?: number
  maxLength?: number
  required?: boolean
  type?: 'text' | 'textarea'
  rows?: number
  className?: string
  showProgress?: boolean
  debounceMs?: number
}

/**
 * Enhanced input component with real-time validation and user feedback
 */
export function ValidatedInput({
  value,
  onChange,
  onValidation,
  validator,
  placeholder,
  label,
  minLength = 3,
  maxLength = 100,
  required = true,
  type = 'text',
  rows = 4,
  className = '',
  showProgress = true,
  debounceMs = 300
}: ValidatedInputProps) {
  const [error, setError] = useState<string>('')
  const [touched, setTouched] = useState(false)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  const validationState = getFieldValidationState(value, minLength, maxLength)

  const handleValidation = useCallback((inputValue: string) => {
    if (validator) {
      const result = validator(inputValue)
      setError(result.error || '')
      onValidation?.(result.isValid, result.error)
    } else {
      // Basic length validation
      let validationError = ''
      if (required && !inputValue.trim()) {
        validationError = `${label} is required`
      } else if (inputValue.length > 0 && inputValue.length < minLength) {
        validationError = `${label} should be at least ${minLength} characters long`
      } else if (inputValue.length > maxLength) {
        validationError = `${label} should be under ${maxLength} characters`
      }
      
      setError(validationError)
      onValidation?.(!validationError, validationError)
    }
  }, [validator, onValidation, label, minLength, maxLength, required])

  const handleChange = (newValue: string) => {
    onChange(newValue)
    
    // Clear previous timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    
    // Clear error on input if field was previously valid
    if (touched && error && newValue.length > value.length) {
      setError('')
    }
    
    // Debounced validation
    const timeout = setTimeout(() => {
      handleValidation(newValue)
    }, debounceMs)
    
    setDebounceTimeout(timeout)
  }

  const handleBlur = () => {
    setTouched(true)
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    handleValidation(value)
  }

  const hasError = touched && error
  const isValid = !hasError && validationState.isValid && value.length > 0
  const isWarning = validationState.isWarning && !hasError

  const inputClasses = [
    className,
    hasError ? 'error' : '',
    isValid ? 'valid' : '',
    isWarning ? 'warning' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className="validated-input">
      <label className="input-label">
        {label} {required && <span className="required-indicator">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          className={inputClasses}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? `${label}-error` : undefined}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={inputClasses}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? `${label}-error` : undefined}
        />
      )}

      <div className="input-feedback">
        {showProgress && (
          <div className="input-meta">
            <span className={`character-count ${
              validationState.tooLong ? 'error' : 
              validationState.isWarning ? 'warning' : ''
            }`}>
              {value.length}/{maxLength}
            </span>
            
            {validationState.isValid && !hasError && (
              <span className="validation-success">✓</span>
            )}
          </div>
        )}
        
        {hasError && (
          <FieldError 
            error={error}
            className="mt-2"
          />
        )}
        
        {!hasError && isValid && (
          <div className="success-message">
            <i className="success-icon">✓</i>
            <span>Looks good!</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ValidatedInput