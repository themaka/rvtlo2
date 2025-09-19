import { memo } from 'react'

interface LoadingIndicatorProps {
  message: string
  progress: number
}

export const LoadingIndicator = memo<LoadingIndicatorProps>(function LoadingIndicator({ 
  message, 
  progress 
}) {
  return (
    <div className="loading-indicator">
      <div className="loading-header">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
      <div className="loading-bar">
        <div className="loading-progress" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  )
})