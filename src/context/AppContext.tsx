import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { 
  Step, 
  Goal, 
  Assessment, 
  LearningObjective,
  CourseType 
} from '../types'

// Define the shape of our application state
export interface AppState {
  // Course Setup State
  courseType: CourseType | null
  courseSubject: string
  targetAudience: string
  instructionDuration: string
  isSubjectConfirmed: boolean
  isSetupComplete: boolean
  
  // Navigation State
  currentStep: Step
  
  // Goals State
  goals: Goal[]
  currentGoal: string
  refinedGoals: Goal[]
  approvedGoals: Goal[]
  
  // Assessments State
  refinedAssessments: Assessment[]
  approvedAssessments: Assessment[]
  
  // Learning Objectives State
  refinedObjectives: LearningObjective[]
  approvedObjectives: LearningObjective[]
  
  // UI State
  isRefining: boolean
  loadingMessage: string
  progress: number
  error: string
  inputErrors: Record<string, string>
  showHelp: boolean
}

// Define the actions/setters interface
export interface AppActions {
  // Course Setup Actions
  setCourseType: (type: CourseType | null) => void
  setCourseSubject: (subject: string) => void
  setTargetAudience: (audience: string) => void
  setInstructionDuration: (duration: string) => void
  setIsSubjectConfirmed: (confirmed: boolean) => void
  setIsSetupComplete: (complete: boolean) => void
  
  // Navigation Actions
  setCurrentStep: (step: Step) => void
  
  // Goals Actions
  setGoals: (goals: Goal[] | ((prev: Goal[]) => Goal[])) => void
  setCurrentGoal: (goal: string) => void
  setRefinedGoals: (goals: Goal[]) => void
  setApprovedGoals: (goals: Goal[]) => void
  
  // Assessments Actions
  setRefinedAssessments: (assessments: Assessment[]) => void
  setApprovedAssessments: (assessments: Assessment[]) => void
  
  // Learning Objectives Actions
  setRefinedObjectives: (objectives: LearningObjective[]) => void
  setApprovedObjectives: (objectives: LearningObjective[]) => void
  
  // UI Actions
  setIsRefining: (refining: boolean) => void
  setLoadingMessage: (message: string) => void
  setProgress: (progress: number) => void
  setError: (error: string) => void
  setInputErrors: (errors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setShowHelp: (show: boolean) => void
}

// Combined context interface
export interface AppContextType {
  state: AppState
  actions: AppActions
}

// Create the context with undefined default (will be provided by provider)
export const AppContext = createContext<AppContextType | undefined>(undefined)

// Custom hook to use the context with error checking
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

// Provider component interface
export interface AppProviderProps {
  children: ReactNode
}

// Application Provider component
export function AppProvider({ children }: AppProviderProps) {
  // Course Setup State
  const [courseType, setCourseType] = useState<CourseType | null>(null)
  const [courseSubject, setCourseSubject] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [instructionDuration, setInstructionDuration] = useState('')
  const [isSubjectConfirmed, setIsSubjectConfirmed] = useState(false)
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  
  // Navigation State
  const [currentStep, setCurrentStep] = useState<Step>('intro')
  
  // Goals State
  const [goals, setGoals] = useState<Goal[]>([])
  const [currentGoal, setCurrentGoal] = useState('')
  const [refinedGoals, setRefinedGoals] = useState<Goal[]>([])
  const [approvedGoals, setApprovedGoals] = useState<Goal[]>([])
  
  // Assessments State
  const [refinedAssessments, setRefinedAssessments] = useState<Assessment[]>([])
  const [approvedAssessments, setApprovedAssessments] = useState<Assessment[]>([])
  
  // Learning Objectives State
  const [refinedObjectives, setRefinedObjectives] = useState<LearningObjective[]>([])
  const [approvedObjectives, setApprovedObjectives] = useState<LearningObjective[]>([])
  
  // UI State
  const [isRefining, setIsRefining] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({})
  const [showHelp, setShowHelp] = useState(false)

  // Create state object
  const state: AppState = {
    // Course Setup State
    courseType,
    courseSubject,
    targetAudience,
    instructionDuration,
    isSubjectConfirmed,
    isSetupComplete,
    
    // Navigation State
    currentStep,
    
    // Goals State
    goals,
    currentGoal,
    refinedGoals,
    approvedGoals,
    
    // Assessments State
    refinedAssessments,
    approvedAssessments,
    
    // Learning Objectives State
    refinedObjectives,
    approvedObjectives,
    
    // UI State
    isRefining,
    loadingMessage,
    progress,
    error,
    inputErrors,
    showHelp
  }

  // Create actions object
  const actions: AppActions = {
    // Course Setup Actions
    setCourseType,
    setCourseSubject,
    setTargetAudience,
    setInstructionDuration,
    setIsSubjectConfirmed,
    setIsSetupComplete,
    
    // Navigation Actions
    setCurrentStep,
    
    // Goals Actions
    setGoals,
    setCurrentGoal,
    setRefinedGoals,
    setApprovedGoals,
    
    // Assessments Actions
    setRefinedAssessments,
    setApprovedAssessments,
    
    // Learning Objectives Actions
    setRefinedObjectives,
    setApprovedObjectives,
    
    // UI Actions
    setIsRefining,
    setLoadingMessage,
    setProgress,
    setError,
    setInputErrors,
    setShowHelp
  }

  // Create context value
  const contextValue: AppContextType = {
    state,
    actions
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}