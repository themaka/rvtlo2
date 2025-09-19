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
    { key: 'approve', label: '3. Review' },
    { key: 'saved', label: '4. Goals Complete' },
    { key: 'assessments', label: '5. Assessments' },
    { key: 'assessment-review', label: '6. Review' },
    { key: 'assessment-saved', label: '7. Assessment Complete' },
    { key: 'learning-objectives', label: '8. Learning Objectives' },
    { key: 'objectives-review', label: '9. Review' },
    { key: 'objectives-saved', label: '10. Complete' }
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