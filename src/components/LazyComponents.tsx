import { lazy, Suspense } from 'react'
import { LoadingIndicator } from './LoadingIndicator'

// Lazy load heavy components
export const LazyHelpPanel = lazy(() => import('./HelpPanel').then(module => ({ default: module.HelpPanel })))
export const LazyErrorBoundary = lazy(() => import('./ErrorBoundary').then(module => ({ default: module.ErrorBoundary })))

// Wrapper components with Suspense fallbacks
interface LazyWrapperProps {
  children: React.ReactNode
}

export const LazyHelpPanelWrapper = ({ ...props }: React.ComponentProps<typeof LazyHelpPanel>) => (
  <Suspense fallback={<LoadingIndicator message="Loading help..." progress={50} />}>
    <LazyHelpPanel {...props} />
  </Suspense>
)

export const LazyErrorBoundaryWrapper = ({ children, ...props }: LazyWrapperProps & React.ComponentProps<typeof LazyErrorBoundary>) => (
  <Suspense fallback={<LoadingIndicator message="Loading error handler..." progress={50} />}>
    <LazyErrorBoundary {...props}>
      {children}
    </LazyErrorBoundary>
  </Suspense>
)

// Dynamic import utility for services
export const dynamicImports = {
  aiService: () => import('../services/aiService'),
  errorHandling: () => import('../utils/errorHandling'),
  validation: () => import('../utils/validation'),
  navigation: () => import('../utils/navigation')
}

// Preload critical services
export const preloadCriticalServices = () => {
  // Preload frequently used services
  dynamicImports.validation()
  dynamicImports.navigation()
}

// Lazy load AI service only when needed
export const loadAIService = async () => {
  const module = await dynamicImports.aiService()
  return module
}