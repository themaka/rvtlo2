import type { ReactNode } from 'react'

interface ButtonGroupProps {
  children: ReactNode
  className?: string
}

export function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return (
    <div className={`button-group ${className}`.trim()}>
      {children}
    </div>
  )
}