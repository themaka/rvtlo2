import type { ReactNode } from 'react'

interface StepContainerProps {
  title: string
  description?: string
  children: ReactNode
}

export function StepContainer({ title, description, children }: StepContainerProps) {
  return (
    <div className="step-container">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}