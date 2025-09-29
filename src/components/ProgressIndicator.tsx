import type { Step } from '../types'
import { memo } from 'react'

interface ProgressIndicatorProps {
  onNavigateToStep: (step: Step) => void
  canNavigateToStep: (step: Step) => boolean
  getStepStatus: (step: string) => string
}

interface StepInfo {
  key: Step
  label: string
}

export const ProgressIndicator = memo(function ProgressIndicator({ 
  onNavigateToStep, 
  canNavigateToStep, 
  getStepStatus 
}: ProgressIndicatorProps) {
  const steps: StepInfo[] = [
    { key: 'intro', label: '1. Setup' },
    { key: 'goals', label: '2. Goals' },
    { key: 'review-goals', label: '3. Review Goals' },
    { key: 'assessments', label: '4. Assessments' },
    { key: 'review-assessments', label: '5. Review Assessments' },
    { key: 'objectives', label: '6. Objectives' },
    { key: 'review-objectives', label: '7. Review Objectives' },
    { key: 'complete', label: '8. Complete' }
  ]

  return (
    <div className="progress-indicator">
      {steps.map((step) => (
        <span
          key={step.key}
          className={getStepStatus(step.key)}
          onClick={() => onNavigateToStep(step.key)}
          style={{ cursor: canNavigateToStep(step.key) ? 'pointer' : 'default' }}
        >
          {step.label}
        </span>
      ))}
    </div>
  )
})