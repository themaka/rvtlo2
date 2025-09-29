// Core data interfaces
export interface Goal {
  id: number
  description: string
  isRefined?: boolean
}

export interface Assessment {
  id: number
  goalId: number
  description: string
  isRefined?: boolean
}

export interface LearningObjective {
  id: number
  goalId: number
  bloomLevel: string
  description: string
  assessmentAlignment: string
}

// Application flow types - Streamlined 8-step workflow
export type Step = 
  | 'intro' 
  | 'goals' 
  | 'review-goals' 
  | 'assessments' 
  | 'review-assessments' 
  | 'objectives' 
  | 'review-objectives' 
  | 'complete'

export type CourseType = 'course' | 'workshop'

export type StepStatus = 'completed' | 'active' | 'upcoming'

// Input validation types
export interface InputErrors {
  [key: string]: string
}

// Help content types
export interface HelpContent {
  title: string
  content: string[]
}

export interface HelpContentMap {
  [key: string]: HelpContent
}

// State management types
export interface AppState {
  currentStep: Step
  courseType: CourseType | null
  courseSubject: string
  targetAudience: string
  instructionDuration: string
  isSubjectConfirmed: boolean
  isSetupComplete: boolean
  goals: Goal[]
  currentGoal: string
  refinedGoals: Goal[]
  approvedGoals: Goal[]
  refinedAssessments: Assessment[]
  approvedAssessments: Assessment[]
  refinedObjectives: LearningObjective[]
  approvedObjectives: LearningObjective[]
  isRefining: boolean
  loadingMessage: string
  progress: number
  error: string
  inputErrors: InputErrors
  showHelp: boolean
}

// AI Service types
export interface AIPromptContext {
  courseType: CourseType
  courseSubject: string
  targetAudience: string
  instructionDuration: string
}

export interface AIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}