import type { Step, Goal, Assessment, LearningObjective } from '../types'

// Define the step order for the workflow
export const STEP_ORDER: Step[] = [
  'intro',
  'goals', 
  'approve',
  'saved',
  'assessments',
  'assessment-review',
  'assessment-saved',
  'learning-objectives',
  'objectives-review',
  'objectives-saved'
]

// Interface for the application state needed for navigation decisions
export interface NavigationState {
  currentStep: Step
  courseType: 'course' | 'workshop' | null
  isSubjectConfirmed: boolean
  isSetupComplete: boolean
  goals: Goal[]
  approvedGoals: Goal[]
  refinedAssessments: Assessment[]
  approvedAssessments: Assessment[]
  refinedObjectives: LearningObjective[]
  approvedObjectives: LearningObjective[]
}

// Interface for state setters used in navigation
export interface NavigationActions {
  setCurrentStep: (step: Step) => void
  setError: (error: string) => void
  setCourseType: (type: 'course' | 'workshop' | null) => void
  setCourseSubject: (subject: string) => void
  setTargetAudience: (audience: string) => void
  setInstructionDuration: (duration: string) => void
  setIsSubjectConfirmed: (confirmed: boolean) => void
  setIsSetupComplete: (complete: boolean) => void
  setGoals: (goals: Goal[]) => void
  setCurrentGoal: (goal: string) => void
  setRefinedGoals: (goals: Goal[]) => void
  setApprovedGoals: (goals: Goal[]) => void
  setRefinedAssessments: (assessments: Assessment[]) => void
  setApprovedAssessments: (assessments: Assessment[]) => void
  setRefinedObjectives: (objectives: LearningObjective[]) => void
  setApprovedObjectives: (objectives: LearningObjective[]) => void
}

/**
 * Determines the status of a step based on current position in workflow
 */
export function getStepStatus(step: string, currentStep: Step): 'completed' | 'active' | 'upcoming' {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  const stepIndex = STEP_ORDER.indexOf(step as Step)
  
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'active'
  return 'upcoming'
}

/**
 * Determines if navigation to a target step is allowed based on current state
 */
export function canNavigateToStep(targetStep: Step, state: NavigationState): boolean {
  // Define navigation rules based on completion requirements
  switch (targetStep) {
    case 'intro':
      return true
    case 'goals':
      return state.courseType !== null && state.isSubjectConfirmed && state.isSetupComplete
    case 'approve':
      return state.goals.length > 0
    case 'saved':
      return state.approvedGoals.length > 0
    case 'assessments':
      return state.approvedGoals.length > 0
    case 'assessment-review':
      return state.refinedAssessments.length > 0
    case 'assessment-saved':
      return state.approvedAssessments.length > 0
    case 'learning-objectives':
      return state.approvedGoals.length > 0 && state.approvedAssessments.length > 0
    case 'objectives-review':
      return state.refinedObjectives.length > 0
    case 'objectives-saved':
      return state.approvedObjectives.length > 0
    default:
      return false
  }
}

/**
 * Safely navigates to a target step if navigation is allowed
 */
export function navigateToStep(
  targetStep: Step, 
  state: NavigationState, 
  actions: Pick<NavigationActions, 'setCurrentStep' | 'setError'>
): boolean {
  if (canNavigateToStep(targetStep, state)) {
    actions.setError('')
    actions.setCurrentStep(targetStep)
    return true
  }
  return false
}

/**
 * Resets the entire application state to initial values
 */
export function resetApplication(actions: NavigationActions): void {
  actions.setCurrentStep('intro')
  actions.setCourseType(null)
  actions.setCourseSubject('')
  actions.setTargetAudience('')
  actions.setInstructionDuration('')
  actions.setIsSubjectConfirmed(false)
  actions.setIsSetupComplete(false)
  actions.setGoals([])
  actions.setCurrentGoal('')
  actions.setRefinedGoals([])
  actions.setApprovedGoals([])
  actions.setRefinedAssessments([])
  actions.setApprovedAssessments([])
  actions.setRefinedObjectives([])
  actions.setApprovedObjectives([])
}

/**
 * Gets the next step in the workflow sequence
 */
export function getNextStep(currentStep: Step): Step | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  if (currentIndex >= 0 && currentIndex < STEP_ORDER.length - 1) {
    return STEP_ORDER[currentIndex + 1]
  }
  return null
}

/**
 * Gets the previous step in the workflow sequence
 */
export function getPreviousStep(currentStep: Step): Step | null {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  if (currentIndex > 0) {
    return STEP_ORDER[currentIndex - 1]
  }
  return null
}

/**
 * Checks if the workflow is complete (reached final step)
 */
export function isWorkflowComplete(currentStep: Step): boolean {
  return currentStep === 'objectives-saved'
}

/**
 * Gets the progress percentage through the workflow
 */
export function getWorkflowProgress(currentStep: Step): number {
  const currentIndex = STEP_ORDER.indexOf(currentStep)
  if (currentIndex === -1) return 0
  return Math.round((currentIndex / (STEP_ORDER.length - 1)) * 100)
}

/**
 * Helper function to create navigation state object from current values
 */
export function createNavigationState(
  currentStep: Step,
  courseType: 'course' | 'workshop' | null,
  isSubjectConfirmed: boolean,
  isSetupComplete: boolean,
  goals: Goal[],
  approvedGoals: Goal[],
  refinedAssessments: Assessment[],
  approvedAssessments: Assessment[],
  refinedObjectives: LearningObjective[],
  approvedObjectives: LearningObjective[]
): NavigationState {
  return {
    currentStep,
    courseType,
    isSubjectConfirmed,
    isSetupComplete,
    goals,
    approvedGoals,
    refinedAssessments,
    approvedAssessments,
    refinedObjectives,
    approvedObjectives
  }
}