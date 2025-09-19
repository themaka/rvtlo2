/**
 * Lazy loading utilities for AI service operations
 * This helps reduce initial bundle size by loading AI functionality only when needed
 */

/**
 * Lazy load the AI service module
 */
export const loadAIService = async () => {
  try {
    const module = await import('./aiService')
    return {
      refineGoalsWithAI: module.refineGoalsWithAI,
      generateAssessments: module.generateAssessments,
      generateLearningObjectives: module.generateLearningObjectives
    }
  } catch (error) {
    console.error('Failed to load AI service:', error)
    throw new Error('AI service unavailable')
  }
}

/**
 * Preload AI service in the background after critical components load
 */
export const preloadAIService = () => {
  // Use a timeout to avoid blocking initial render
  setTimeout(() => {
    loadAIService().catch(console.warn)
  }, 1000)
}