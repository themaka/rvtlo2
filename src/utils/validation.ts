import type { Goal } from '../types'
import { createAppError, ErrorCategory, ErrorSeverity, type AppError } from './errorHandling'

export interface ValidationResult {
  isValid: boolean
  error?: string
  appError?: AppError
}

export interface ValidationCallbacks {
  setInputErrors: (errors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setError: (error: string) => void
  setCourseSubject?: (subject: string) => void
  setIsSubjectConfirmed?: (confirmed: boolean) => void
  setTargetAudience?: (audience: string) => void
  setInstructionDuration?: (duration: string) => void
  setIsSetupComplete?: (complete: boolean) => void
}

/**
 * Enhanced validation with AppError integration
 */
function createValidationError(message: string, field: string): AppError {
  return createAppError(
    `Validation failed for ${field}`,
    { field, userInput: true },
    {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      userMessage: message,
      recoverable: true,
      retryable: false
    }
  )
}

/**
 * Enhanced validation with immediate feedback helpers
 */
export const getFieldValidationState = (value: string, minLength: number, maxLength: number) => {
  const length = value.length
  
  return {
    isEmpty: length === 0,
    tooShort: length > 0 && length < minLength,
    tooLong: length > maxLength,
    isValid: length >= minLength && length <= maxLength,
    isWarning: length > maxLength * 0.8 && length <= maxLength,
    progress: Math.min(100, Math.max(0, (length / maxLength) * 100))
  }
}

/**
 * Debounced validation helper for real-time feedback
 */
export const createDebouncedValidator = (
  validator: (value: string) => ValidationResult,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (value: string, callback: (result: ValidationResult) => void) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      const result = validator(value)
      callback(result)
    }, delay)
  }
}

/**
 * Validates course subject input
 */
export const validateCourseSubject = (courseSubject: string): ValidationResult => {
  const trimmedSubject = courseSubject.trim()
  
  if (!trimmedSubject) {
    const error = 'Please enter a course subject.'
    return { 
      isValid: false, 
      error,
      appError: createValidationError(error, 'course subject')
    }
  }
  
  if (trimmedSubject.length < 3) {
    const error = 'Course subject should be at least 3 characters long.'
    return { 
      isValid: false, 
      error,
      appError: createValidationError(error, 'course subject')
    }
  }
  
  if (trimmedSubject.length > 100) {
    const error = 'Course subject should be under 100 characters.'
    return { 
      isValid: false, 
      error,
      appError: createValidationError(error, 'course subject')
    }
  }
  
  return { isValid: true }
}

/**
 * Validates target audience input
 */
export const validateTargetAudience = (targetAudience: string): ValidationResult => {
  const trimmedAudience = targetAudience.trim()
  
  if (!trimmedAudience) {
    return { isValid: false, error: 'Please describe your target audience.' }
  }
  
  if (trimmedAudience.length < 5) {
    return { isValid: false, error: 'Target audience description should be at least 5 characters long.' }
  }
  
  if (trimmedAudience.length > 200) {
    return { isValid: false, error: 'Target audience description should be under 200 characters.' }
  }
  
  return { isValid: true }
}

/**
 * Validates instruction duration input
 */
export const validateInstructionDuration = (instructionDuration: string): ValidationResult => {
  const trimmedDuration = instructionDuration.trim()
  
  if (!trimmedDuration) {
    return { isValid: false, error: 'Please specify the instruction duration.' }
  }
  
  if (trimmedDuration.length < 3) {
    return { isValid: false, error: 'Duration should be at least 3 characters long.' }
  }
  
  if (trimmedDuration.length > 100) {
    return { isValid: false, error: 'Duration should be under 100 characters.' }
  }
  
  return { isValid: true }
}

/**
 * Validates goal input
 */
export const validateGoal = (
  currentGoal: string,
  existingGoals: Goal[],
  courseSubject?: string
): ValidationResult => {
  const trimmedGoal = currentGoal.trim()
  
  if (!trimmedGoal) {
    return { isValid: false, error: 'Please enter a goal before adding.' }
  }
  
  if (trimmedGoal.length < 10) {
    return { isValid: false, error: 'Goals should be at least 10 characters long for meaningful refinement.' }
  }
  
  if (trimmedGoal.length > 300) {
    return { isValid: false, error: 'Goals should be under 300 characters. Consider breaking into multiple goals.' }
  }
  
  // Check if the goal appears to be just the course subject
  if (courseSubject && courseSubject.trim().toLowerCase() === trimmedGoal.toLowerCase()) {
    return { isValid: false, error: `Please enter a learning goal, not the course subject. Goals should describe what students will be able to do related to "${courseSubject}".` }
  }
  
  // Check for duplicate goals
  const isDuplicate = existingGoals.some(goal => 
    goal.description.toLowerCase().trim() === trimmedGoal.toLowerCase()
  )
  
  if (isDuplicate) {
    return { isValid: false, error: 'This goal already exists. Please enter a different goal.' }
  }
  
  // Check maximum goals limit
  if (existingGoals.length >= 5) {
    return { isValid: false, error: 'Maximum of 5 goals allowed. Please remove a goal before adding a new one.' }
  }
  
  return { isValid: true }
}

/**
 * Validates and confirms course subject with side effects
 */
export const validateAndConfirmSubject = (
  courseSubject: string,
  callbacks: ValidationCallbacks
) => {
  callbacks.setInputErrors({})
  callbacks.setError('')
  
  const validation = validateCourseSubject(courseSubject)
  
  if (!validation.isValid) {
    callbacks.setInputErrors({ subject: validation.error! })
    return false
  }
  
  const trimmedSubject = courseSubject.trim()
  if (callbacks.setCourseSubject) {
    callbacks.setCourseSubject(trimmedSubject)
  }
  if (callbacks.setIsSubjectConfirmed) {
    callbacks.setIsSubjectConfirmed(true)
  }
  
  return true
}

/**
 * Validates and completes setup with side effects
 */
export const validateAndCompleteSetup = (
  targetAudience: string,
  instructionDuration: string,
  callbacks: ValidationCallbacks
) => {
  callbacks.setInputErrors({})
  callbacks.setError('')
  
  const audienceValidation = validateTargetAudience(targetAudience)
  const durationValidation = validateInstructionDuration(instructionDuration)
  
  if (!audienceValidation.isValid) {
    callbacks.setInputErrors({ audience: audienceValidation.error! })
    return false
  }
  
  if (!durationValidation.isValid) {
    callbacks.setInputErrors({ duration: durationValidation.error! })
    return false
  }
  
  const trimmedAudience = targetAudience.trim()
  const trimmedDuration = instructionDuration.trim()
  
  if (callbacks.setTargetAudience) {
    callbacks.setTargetAudience(trimmedAudience)
  }
  if (callbacks.setInstructionDuration) {
    callbacks.setInstructionDuration(trimmedDuration)
  }
  if (callbacks.setIsSetupComplete) {
    callbacks.setIsSetupComplete(true)
  }
  
  return true
}

/**
 * Validates goal and adds it to the list with side effects
 */
export const validateAndAddGoal = (
  currentGoal: string,
  existingGoals: Goal[],
  callbacks: ValidationCallbacks & {
    setGoals: (updater: (prev: Goal[]) => Goal[]) => void
    setCurrentGoal: (goal: string) => void
  },
  courseSubject?: string
) => {
  // Clear any previous errors
  callbacks.setInputErrors({})
  callbacks.setError('')
  
  const validation = validateGoal(currentGoal, existingGoals, courseSubject)
  
  if (!validation.isValid) {
    callbacks.setInputErrors({ goal: validation.error! })
    return false
  }
  
  const trimmedGoal = currentGoal.trim()
  const newGoal: Goal = {
    id: Date.now(),
    description: trimmedGoal
  }
  
  console.log('Adding new goal:', newGoal)
  callbacks.setGoals(prev => {
    const updatedGoals = [...prev, newGoal]
    console.log('Updated goals array:', updatedGoals)
    return updatedGoals
  })
  callbacks.setCurrentGoal('')
  
  return true
}