import type { ReactNode } from 'react'
import { memo } from 'react'

interface ButtonGroupProps {
  children: ReactNode
  className?: string
}

export const ButtonGroup = memo(function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return (
    <div className={`button-group ${className}`.trim()}>
      {children}
    </div>
  )
})