import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
}

/**
 * Error Boundary component to catch React component errors gracefully
 * Provides user-friendly fallback UI and optional error reporting
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking/reporting
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })

    // Update state with error info
    this.setState({
      errorInfo
    })

    // Call optional error reporting callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId)
    }
  }

  handleResetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  handleRefreshPage = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <span className="error-icon">⚠️</span>
            </div>
            
            <h2 className="error-boundary-title">
              Oops! Something went wrong
            </h2>
            
            <p className="error-boundary-message">
              We encountered an unexpected error while loading this section. 
              Don't worry - your data is safe and we can get you back on track.
            </p>
            
            <div className="error-boundary-details">
              <details>
                <summary>Technical Details (for developers)</summary>
                <div className="error-boundary-technical">
                  <p><strong>Error ID:</strong> {this.state.errorId}</p>
                  <p><strong>Error:</strong> {this.state.error?.message}</p>
                  <p><strong>Location:</strong> {this.state.errorInfo?.componentStack}</p>
                  <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
                </div>
              </details>
            </div>
            
            <div className="error-boundary-actions">
              <button 
                onClick={this.handleResetError}
                className="button-secondary"
                type="button"
              >
                Try Again
              </button>
              
              <button 
                onClick={this.handleRefreshPage}
                className="button-primary"
                type="button"
              >
                Refresh Page
              </button>
            </div>
            
            <div className="error-boundary-help">
              <p>
                If this problem persists, try refreshing the page or 
                <a href="/" className="error-boundary-link"> starting over</a>.
              </p>
              <p>
                <small>
                  Error ID: <code>{this.state.errorId}</code> - 
                  Please include this ID if reporting the issue.
                </small>
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary