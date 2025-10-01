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
    { key: 'goals', label: '2. Set Goals' },
    { key: 'review-goals', label: '3. Review Goals' },
    { key: 'assessments', label: '4. Assessments' },
    { key: 'review-objectives', label: '5. Review Objectives' },
    { key: 'complete', label: '6. Complete' }
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