import type { ReactNode } from 'react'
import { memo } from 'react'

interface StepContainerProps {
  title: string
  description?: string
  children: ReactNode
}

export const StepContainer = memo(function StepContainer({ title, description, children }: StepContainerProps) {
  return (
    <div className="step-container">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  )
})