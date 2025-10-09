import { useCallback, useMemo } from 'react'
import type { 
  Step
} from './types'
import { 
  validateAndConfirmSubject,
  validateAndCompleteSetup,
  validateAndAddGoal 
} from './utils/validation'
import {
  getStepStatus,
  canNavigateToStep,
  navigateToStep as navigateToStepUtil,
  resetApplication,
  createNavigationState,
  type NavigationActions
} from './utils/navigation'
import { 
  refineGoalsWithAI as refineGoalsService,
  generateAssessments as generateAssessmentsService,
  generateLearningObjectives as generateLearningObjectivesService,
  type CourseContext
} from './services/aiService'
import { LoadingIndicator, HelpPanel, AppHeader, ProgressIndicator, StepContainer, ButtonGroup, ErrorBoundary } from './components'
import { useUIState, useNavigation, useCourseSetup, useGoalsManagement, useAssessments, useObjectives } from './context/AppContext'
import './App.css'

function App() {
  // Get state from context hooks
  const { showHelp, setShowHelp, isRefining, setIsRefining, loadingMessage, setLoadingMessage, progress, setProgress, error, setError, inputErrors, setInputErrors } = useUIState()
  const { currentStep, setCurrentStep } = useNavigation()
  const { 
    courseType, setCourseType,
    courseSubject, setCourseSubject, 
    targetAudience, setTargetAudience,
    instructionDuration, setInstructionDuration,
    isSubjectConfirmed, setIsSubjectConfirmed,
    isSetupComplete, setIsSetupComplete
  } = useCourseSetup()
  const { goals, setGoals, currentGoal, setCurrentGoal, refinedGoals, setRefinedGoals, approvedGoals, setApprovedGoals } = useGoalsManagement()
  const { refinedAssessments, setRefinedAssessments, approvedAssessments, setApprovedAssessments } = useAssessments()
  const { refinedObjectives, setRefinedObjectives, approvedObjectives, setApprovedObjectives } = useObjectives()

  const addGoal = () => {
    return validateAndAddGoal(currentGoal, goals, {
      setInputErrors,
      setError,
      setGoals,
      setCurrentGoal
    }, courseSubject)
  }

  const validateAndConfirmSubjectHandler = () => {
    return validateAndConfirmSubject(courseSubject, {
      setInputErrors,
      setError,
      setCourseSubject,
      setIsSubjectConfirmed
    })
  }

  const validateAndCompleteSetupHandler = () => {
    return validateAndCompleteSetup(targetAudience, instructionDuration, {
      setInputErrors,
      setError,
      setTargetAudience,
      setInstructionDuration,
      setIsSetupComplete
    })
  }

  const removeGoal = (id: number) => {
    setGoals(prev => prev.filter(goal => goal.id !== id))
  }

  const refineGoalsWithAI = async () => {
    if (!courseType) return // Guard against null courseType
    
    const context: CourseContext = {
      courseType,
      courseSubject,
      targetAudience,
      instructionDuration
    }

    await refineGoalsService(goals, context, {
      setIsRefining,
      setLoadingMessage,
      setProgress,
      setError,
      setCurrentStep,
      setRefinedGoals
    })
  }

  const generateAssessments = useCallback(async (goalsToUse = approvedGoals) => {
    if (!courseType || goalsToUse.length === 0) return // Guard against null courseType and empty goals
    
    const context: CourseContext = {
      courseType,
      courseSubject,
      targetAudience,
      instructionDuration
    }

    await generateAssessmentsService(goalsToUse, context, {
      setIsRefining,
      setLoadingMessage,
      setProgress,
      setError,
      setCurrentStep,
      setRefinedAssessments
    })
  }, [courseType, courseSubject, targetAudience, instructionDuration, approvedGoals, setCurrentStep, setError, setIsRefining, setLoadingMessage, setProgress, setRefinedAssessments])

  const generateLearningObjectives = useCallback(async (goalsToUse = approvedGoals, assessmentsToUse = approvedAssessments) => {
    if (!courseType || goalsToUse.length === 0 || assessmentsToUse.length === 0) return

    const context: CourseContext = {
      courseType,
      courseSubject,
      targetAudience,
      instructionDuration
    }

    await generateLearningObjectivesService(
      goalsToUse,
      assessmentsToUse,
      context,
      {
        setIsRefining,
        setLoadingMessage,
        setProgress,
        setError,
        setCurrentStep,
        setRefinedObjectives
      }
    )
  }, [approvedGoals, approvedAssessments, courseType, courseSubject, targetAudience, instructionDuration, setCurrentStep, setError, setIsRefining, setLoadingMessage, setProgress, setRefinedObjectives])

  const approveAssessments = useCallback(async () => {
    setApprovedAssessments(refinedAssessments)
    // Automatically generate learning objectives instead of stopping at intermediate screen
    // Pass current data directly to avoid state timing issues
    await generateLearningObjectives(refinedGoals, refinedAssessments)
  }, [refinedAssessments, setApprovedAssessments, generateLearningObjectives, refinedGoals])



  const approveLearningObjectives = useCallback(() => {
    setApprovedObjectives(refinedObjectives)
    setCurrentStep('complete')
  }, [refinedObjectives, setApprovedObjectives, setCurrentStep])



  const approveGoals = useCallback(async () => {
    setApprovedGoals(refinedGoals)
    // Automatically generate assessments and go directly to review
    // Pass refinedGoals directly to avoid state timing issues
    await generateAssessments(refinedGoals)
  }, [refinedGoals, setApprovedGoals, generateAssessments])

  // Create navigation state helper
  const navigationState = useMemo(() => createNavigationState(
    currentStep,
    courseType,
    isSubjectConfirmed,
    isSetupComplete,
    goals,
    approvedGoals,
    refinedAssessments,
    approvedAssessments,
    refinedObjectives,
    approvedObjectives
  ), [currentStep, courseType, isSubjectConfirmed, isSetupComplete, goals, approvedGoals, refinedAssessments, approvedAssessments, refinedObjectives, approvedObjectives])

  // Navigation wrapper functions that use the utility functions
  const navigateToStep = useCallback((targetStep: Step) => {
    navigateToStepUtil(targetStep, navigationState, { setCurrentStep, setError })
  }, [navigationState, setCurrentStep, setError])

  const canNavigateToStepCheck = useCallback((targetStep: Step) => {
    return canNavigateToStep(targetStep, navigationState)
  }, [navigationState])

  const getStepStatusCheck = useCallback((step: string) => {
    return getStepStatus(step, currentStep)
  }, [currentStep])

  const resetApp = () => {
    const actions: NavigationActions = {
      setCurrentStep,
      setError,
      setCourseType,
      setCourseSubject,
      setTargetAudience,
      setInstructionDuration,
      setIsSubjectConfirmed,
      setIsSetupComplete,
      setGoals,
      setCurrentGoal,
      setRefinedGoals,
      setApprovedGoals,
      setRefinedAssessments,
      setApprovedAssessments,
      setRefinedObjectives,
      setApprovedObjectives
    }
    resetApplication(actions)
  }

  const renderIntro = () => (
    <StepContainer 
      title="Welcome to the Course Goal Builder"
      description={`This tool will help you define clear, actionable goals for your ${courseType || 'course/workshop'} using backward design principles.`}
    >
      {!courseType ? (
        <div className="selection-container">
          <h3>What type of instruction are you planning?</h3>
          <ButtonGroup>
            <button
              className="option-button"
              onClick={() => setCourseType('course')}
            >
              Course
            </button>
            <button
              className="option-button"
              onClick={() => setCourseType('workshop')}
            >
              Workshop
            </button>
          </ButtonGroup>
        </div>
      ) : !isSubjectConfirmed ? (
        <div className="selection-container">
          <p>You selected: <strong>{courseType}</strong></p>
          <h3>What is the subject of your {courseType}?</h3>
          <p className="instruction">Please enter the subject or topic area (e.g., "Introduction to Psychology", "Data Science Fundamentals", "Creative Writing", etc.)</p>
          <div className="goal-input">
            <input
              type="text"
              value={courseSubject}
              onChange={(e) => {
                setCourseSubject(e.target.value)
                // Clear errors when user starts typing
                if (inputErrors.subject) {
                  setInputErrors(prev => ({ ...prev, subject: '' }))
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && courseSubject.trim() && validateAndConfirmSubjectHandler()}
              placeholder="e.g., Introduction to Biology, Web Development Workshop..."
              style={{ flex: 1 }}
              className={inputErrors.subject ? 'error' : ''}
            />
          </div>
          
          <div className="input-helper">
            <span className={`character-count ${courseSubject.length > 100 ? 'error' : courseSubject.length > 80 ? 'warning' : ''}`}>
              {courseSubject.length}/100 characters
            </span>
            {courseSubject.length >= 3 && courseSubject.length <= 100 && !inputErrors.subject && (
              <span className="validation-success">✓ Good length</span>
            )}
          </div>
          
          {inputErrors.subject && (
            <div className="error-message">
              <i className="error-icon">⚠️</i>
              {inputErrors.subject}
            </div>
          )}

          <ButtonGroup>
            <button
              className="secondary-button"
              onClick={() => setCourseType(null)}
            >
              Back
            </button>
            <button
              className="primary-button"
              onClick={validateAndConfirmSubjectHandler}
              disabled={!courseSubject.trim()}
            >
              Continue
            </button>
          </ButtonGroup>
        </div>
      ) : !isSetupComplete ? (
        <div className="selection-container">
          <p>You selected: <strong>{courseType}</strong></p>
          <p>Subject: <strong>{courseSubject}</strong></p>
          
          <h3>Tell us about your target audience</h3>
          <p className="instruction">Who are your learners? (e.g., "First-year college students", "Professional engineers with 5+ years experience", "High school seniors")</p>
          <div className="goal-input">
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => {
                setTargetAudience(e.target.value)
                if (inputErrors.audience) {
                  setInputErrors(prev => ({ ...prev, audience: '' }))
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && targetAudience.trim() && instructionDuration.trim() && validateAndCompleteSetupHandler()}
              placeholder="e.g., Graduate students in computer science, Working professionals..."
              className={inputErrors.audience ? 'error' : ''}
            />
          </div>
          
          <div className="input-helper">
            <span className={`character-count ${targetAudience.length > 200 ? 'error' : targetAudience.length > 160 ? 'warning' : ''}`}>
              {targetAudience.length}/200 characters
            </span>
            {targetAudience.length >= 5 && targetAudience.length <= 200 && !inputErrors.audience && (
              <span className="validation-success">✓ Good length</span>
            )}
          </div>
          
          {inputErrors.audience && (
            <div className="error-message">
              <i className="error-icon">⚠️</i>
              {inputErrors.audience}
            </div>
          )}

          <h3>How long is your instruction?</h3>
          <p className="instruction">Specify the duration (e.g., "12-week semester course", "3-hour workshop", "2-day intensive training")</p>
          <div className="goal-input">
            <input
              type="text"
              value={instructionDuration}
              onChange={(e) => {
                setInstructionDuration(e.target.value)
                if (inputErrors.duration) {
                  setInputErrors(prev => ({ ...prev, duration: '' }))
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && targetAudience.trim() && instructionDuration.trim() && validateAndCompleteSetupHandler()}
              placeholder="e.g., 16-week semester, 4-hour workshop, 3-day bootcamp..."
              className={inputErrors.duration ? 'error' : ''}
            />
          </div>
          
          <div className="input-helper">
            <span className={`character-count ${instructionDuration.length > 100 ? 'error' : instructionDuration.length > 80 ? 'warning' : ''}`}>
              {instructionDuration.length}/100 characters
            </span>
            {instructionDuration.length >= 3 && instructionDuration.length <= 100 && !inputErrors.duration && (
              <span className="validation-success">✓ Good length</span>
            )}
          </div>
          
          {inputErrors.duration && (
            <div className="error-message">
              <i className="error-icon">⚠️</i>
              {inputErrors.duration}
            </div>
          )}

          <ButtonGroup>
            <button
              className="secondary-button"
              onClick={() => setIsSubjectConfirmed(false)}
            >
              Back
            </button>
            <button
              className="primary-button"
              onClick={validateAndCompleteSetupHandler}
              disabled={!targetAudience.trim() || !instructionDuration.trim()}
            >
              Continue to Goals
            </button>
          </ButtonGroup>
        </div>
      ) : (
        <div className="confirmation-container">
          <h3>Setup Complete</h3>
          <p><strong>Type:</strong> {courseType}</p>
          <p><strong>Subject:</strong> {courseSubject}</p>
          <p><strong>Target Audience:</strong> {targetAudience}</p>
          <p><strong>Duration:</strong> {instructionDuration}</p>
          <ButtonGroup>
            <button
              className="secondary-button"
              onClick={() => setIsSetupComplete(false)}
            >
              Edit Setup
            </button>
            <button
              className="primary-button"
              onClick={() => setCurrentStep('goals')}
            >
              Start Defining Goals
            </button>
          </ButtonGroup>
        </div>
      )}
    </StepContainer>
  )

  const renderGoals = () => {
    console.log('Rendering goals component with goals state:', goals);
    return (
    <StepContainer 
      title="Define Your High-Level Goals"
    >
      <p>What are the overarching goals for this {courseType} on <strong>{courseSubject}</strong>? Think about the big picture outcomes you want to achieve.</p>
      <p className="instruction">Add your initial goals - we'll refine them together:</p>

      <div className="goal-input">
        <input
          type="text"
          value={currentGoal}
          onChange={(e) => {
            setCurrentGoal(e.target.value)
            // Clear errors when user starts typing
            if (inputErrors.goal) {
              setInputErrors(prev => ({ ...prev, goal: '' }))
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          placeholder="e.g., Improve students' critical thinking skills..."
          className={inputErrors.goal ? 'error' : ''}
        />
        <button
          className="add-button"
          onClick={addGoal}
          disabled={!currentGoal.trim()}
        >
          Add Goal
        </button>
      </div>

      <div className="input-helper">
        <span className={`character-count ${currentGoal.length > 300 ? 'error' : currentGoal.length > 250 ? 'warning' : ''}`}>
          {currentGoal.length}/300 characters
        </span>
        {currentGoal.length >= 10 && currentGoal.length <= 300 && !inputErrors.goal && (
          <span className="validation-success">✓ Good length</span>
        )}
      </div>

      {inputErrors.goal && (
        <div className="error-message">
          <i className="error-icon">⚠️</i>
          {inputErrors.goal}
        </div>
      )}

      {goals.length > 0 && (
        <div className="goals-list">
          <h3>Your Initial Goals:</h3>
          {goals.map((goal) => {
            console.log('Rendering goal item:', goal);
            return (
              <div key={goal.id} className="goal-item">
                <span style={{ display: 'block', color: '#333', minWidth: '80%' }}>
                  {goal.description || "Goal text missing"}
                </span>
                <button
                  className="remove-button"
                  onClick={() => removeGoal(goal.id)}
                  aria-label="Remove goal"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ButtonGroup>
        <button
          className="secondary-button"
          onClick={() => setCurrentStep('intro')}
        >
          Back
        </button>
        <button
          className="primary-button"
          onClick={refineGoalsWithAI}
          disabled={goals.length === 0 || isRefining}
        >
          {isRefining ? 'Refining Goals...' : 'Refine Goals with AI'}
        </button>
      </ButtonGroup>

      {isRefining && (
        <LoadingIndicator message={loadingMessage} progress={progress} />
      )}
    </StepContainer>
    );
  }

  const renderApprove = () => (
    <StepContainer 
      title="Review Refined Goals"
      description="Here's how Claude has refined your goals to make them more specific and actionable:"
    >

      {error && (
        <div className="error-message">
          <i className="error-icon">⚠️</i>
          {error}
        </div>
      )}

      <div className="goal-comparison-sections">
        {refinedGoals.map((refinedGoal, index) => {
          const originalGoal = goals[index] // Assuming they maintain the same order
          
          return (
            <div key={refinedGoal.id} className="goal-comparison-section">
              <div className="goal-header">
                <h3>Goal {index + 1}: {originalGoal?.description}</h3>
              </div>
              
              <div className="refined-goal">
                <h4 className="goal-section-header">AI-Refined Goal:</h4>
                <p className="refined-goal-text">{refinedGoal.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="confirmation-question">
        <h3>Are you happy with these refined goals?</h3>
        <ButtonGroup>
          <button
            className="primary-button"
            onClick={approveGoals}
            disabled={isRefining}
          >
            {isRefining ? 'SAVING AND GENERATING ASSESSMENTS...' : 'SAVE AND CONTINUE'}
          </button>
          <button
            className="secondary-button"
            onClick={() => setCurrentStep('goals')}
          >
            No, Let Me Revise Them
          </button>
        </ButtonGroup>
      </div>

      {isRefining && (
        <LoadingIndicator message={loadingMessage} progress={progress} />
      )}
    </StepContainer>
  )



  const renderAssessments = () => (
    <StepContainer 
      title="Review Assessment Strategies"
      description="Here are the AI-generated assessment strategies for each of your learning goals:"
    >

      {approvedGoals.map((goal, goalIndex) => {
        // Find the assessment that matches this specific goal ID
        const correspondingAssessment = refinedAssessments.find(assessment => assessment.goalId === goal.id)
        const originalGoal = goals[goalIndex] // Get the original goal that user submitted
        
        // Debug logging for troubleshooting
        console.log(`Goal ${goalIndex + 1} (ID: ${goal.id}):`, goal.description)
        console.log(`Looking for assessment with goalId: ${goal.id}`)
        console.log('Found assessment:', correspondingAssessment)
        console.log('All refinedAssessments:', refinedAssessments.map(a => ({ id: a.id, goalId: a.goalId, description: a.description.substring(0, 50) + '...' })))
        
        if (!correspondingAssessment) {
          console.error(`No assessment found for goal ${goalIndex + 1} with ID ${goal.id}`)
          return (
            <div key={`missing-${goal.id}`} className="assessment-review-section">
              <div className="goal-header">
                <h3>Goal {goalIndex + 1}: {originalGoal?.description || 'Unknown Goal'}</h3>
                <p className="goal-text">{goal.description}</p>
              </div>
              
              <div className="assessment-strategies-content">
                <h4>Assessment Strategies:</h4>
                <div className="error-message">
                  <i className="error-icon">⚠️</i>
                  No assessment strategies were generated for this goal. Please try regenerating assessments or contact support.
                </div>
              </div>
            </div>
          )
        }
        
        const assessmentStrategies = parseAssessmentText(correspondingAssessment.description)
        
        // Debug logging for strategy parsing
        console.log(`Assessment description for goal ${goalIndex + 1}:`, correspondingAssessment.description)
        console.log(`Parsed strategies for goal ${goalIndex + 1}:`, assessmentStrategies)
        
        return (
          <div key={correspondingAssessment.id} className="assessment-review-section">
            <div className="goal-header">
              <h3>Goal {goalIndex + 1}: {originalGoal?.description || 'Unknown Goal'}</h3>
              <p className="goal-text">{goal.description}</p>
            </div>
            
            <div className="assessment-strategies-content">
              <h4>Assessment Strategies:</h4>
              {assessmentStrategies.length > 1 ? (
                <ul className="assessment-strategies-list">
                  {assessmentStrategies.map((strategy, index) => (
                    <li key={index} className="assessment-strategy-item">
                      {strategy.title ? (
                        <div className="strategy-with-title">
                          <div className="strategy-title">{strategy.title}</div>
                          <div className="strategy-description">{strategy.description}</div>
                        </div>
                      ) : (
                        <div className="strategy-full-text">{strategy.description}</div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : assessmentStrategies.length === 1 ? (
                assessmentStrategies[0].title ? (
                  <div className="single-strategy-with-title">
                    <h5 className="single-strategy-title">{assessmentStrategies[0].title}</h5>
                    <div className="single-strategy-description">{assessmentStrategies[0].description}</div>
                  </div>
                ) : (
                  <div className="assessment-text">{assessmentStrategies[0].description}</div>
                )
              ) : (
                <div className="assessment-text">{correspondingAssessment.description || 'No assessment description available'}</div>
              )}
            </div>
          </div>
        )
      })}

      <div className="confirmation-question">
        <h3>Are you satisfied with these assessment strategies?</h3>
        <ButtonGroup>
          <button
            className="primary-button"
            onClick={approveAssessments}
            disabled={isRefining}
          >
            {isRefining ? 'SAVING AND GENERATING OBJECTIVES...' : 'SAVE AND CONTINUE'}
          </button>
          <button
            className="secondary-button"
            onClick={() => setCurrentStep('review-goals')}
          >
            Back to Goals
          </button>
        </ButtonGroup>
      </div>

      {isRefining && (
        <LoadingIndicator message={loadingMessage} progress={progress} />
      )}
    </StepContainer>
  )



  

  // Helper function to parse assessment text and detect titles vs descriptions
  const parseAssessmentText = useCallback((description: string) => {
    if (!description || description.trim().length === 0) {
      return []
    }

    // Structure to hold parsed assessments with titles and descriptions
    interface AssessmentStrategy {
      title?: string;
      description: string;
      isFullText?: boolean;
    }

    let strategies: AssessmentStrategy[] = []
    
    // Method 1: Look for markdown titles followed by content (e.g., "**Title**: Description")
    const markdownTitlePattern = /\*\s*\*\*([^*]+?)\*\*:\s*(.+?)(?=\*\s*\*\*[^*]+?\*\*:|$)/gs
    const markdownMatches = Array.from(description.matchAll(markdownTitlePattern))
    
    if (markdownMatches.length > 0) {
      strategies = markdownMatches.map(match => ({
        title: match[1].trim(),
        description: match[2].trim()
      }))
    }
    
    // Method 2: Look for simple title-colon-description pattern (e.g., "Title: Description")
    if (strategies.length === 0) {
      const titleColonPattern = /([^:]+?):\s*(.+?)(?=\n[^:]+?:|$)/gs
      const titleColonMatches = Array.from(description.matchAll(titleColonPattern))
      
      if (titleColonMatches.length > 0) {
        strategies = titleColonMatches.map(match => ({
          title: match[1].trim().replace(/\.$/, '').replace(/^\*+\s*|\*+$/g, ''), // Remove asterisks and periods
          description: match[2].trim()
        }))
      }
    }
    
    // Method 3: Split on asterisk-separated strategies pattern
    if (strategies.length === 0) {
      // Look for patterns like "* **Title**: Description"
      const asteriskStrategyPattern = /\*\s*\*\*([^*]+?)\*\*:\s*([^*]+?)(?=\*\s*\*\*|$)/gs
      const asteriskStrategyMatches = Array.from(description.matchAll(asteriskStrategyPattern))
      
      if (asteriskStrategyMatches.length > 0) {
        strategies = asteriskStrategyMatches.map(match => ({
          title: match[1].trim(),
          description: match[2].trim()
        }))
      } else {
        // Fallback: simple asterisk splitting
        const asteriskParts = description
          .split(/\s*\*\s*/)
          .map(item => item.trim())
          .filter(item => item.length > 10)
        
        if (asteriskParts.length > 1) {
          strategies = asteriskParts.map(part => {
            // Check if this part has a title pattern
            const titleMatch = part.match(/^\*\*([^*]+?)\*\*:\s*(.+)/)
            if (titleMatch) {
              return {
                title: titleMatch[1].trim(),
                description: titleMatch[2].trim()
              }
            }
            return {
              description: part.replace(/^\*+\s*/, ''), // Remove leading asterisks
              isFullText: true
            }
          })
        }
      }
    }
    
    // Method 4: Split on numbered lists (1., 2., etc.)
    if (strategies.length === 0) {
      const numberedParts = description
        .split(/\d+\.\s*/)
        .map(item => item.trim())
        .filter(item => item.length > 10)
      
      if (numberedParts.length > 1) {
        strategies = numberedParts.map(part => ({
          description: part,
          isFullText: true
        }))
      }
    }
    
    // Method 5: Split on bullet points (including • in middle of text)
    if (strategies.length === 0) {
      const bulletParts = description
        .split(/\s*[•]\s*/)
        .map(item => item.trim())
        .filter(item => item.length > 15)
      
      if (bulletParts.length > 1) {
        strategies = bulletParts.map(part => ({
          description: part,
          isFullText: true
        }))
      }
    }
    
    // Method 6: Split on assessment action patterns (Consider, Students, Create, etc.)
    if (strategies.length === 0) {
      const actionParts = description
        .split(/\.\s+(?=(?:Consider|Students|Create|Implement|Develop|A formative|Portfolio)\b)/)
        .map(item => item.trim())
        .filter(item => item.length > 20)
        .map(item => item.endsWith('.') ? item : item + '.')
      
      if (actionParts.length > 1) {
        strategies = actionParts.map(part => ({
          description: part,
          isFullText: true
        }))
      }
    }
    
    // Method 7: Split on periods followed by capital letters (general sentence boundaries)
    if (strategies.length === 0) {
      const sentenceParts = description
        .split(/\.\s+(?=[A-Z])/)
        .map(item => item.trim())
        .filter(item => item.length > 30)
        .map(item => item.endsWith('.') ? item : item + '.')
      
      if (sentenceParts.length > 1 && sentenceParts.length <= 5) { // Avoid too many tiny fragments
        strategies = sentenceParts.map(part => ({
          description: part,
          isFullText: true
        }))
      }
    }
    
    // Method 8: Split on double line breaks (paragraphs)
    if (strategies.length === 0) {
      const paragraphs = description
        .split(/\n\s*\n/)
        .map(item => item.trim())
        .filter(item => item.length > 15)
      
      if (paragraphs.length > 1) {
        strategies = paragraphs.map(part => ({
          description: part,
          isFullText: true
        }))
      }
    }
    
    // Fallback: Return the full description as a single strategy
    if (strategies.length === 0) {
      strategies = [{
        description: description,
        isFullText: true
      }]
    }
    
    console.log('Parsing assessment:', description.substring(0, 100) + '...')
    console.log('Found strategies:', strategies.length, strategies)
    
    return strategies
  }, [])

  const renderObjectivesReview = () => (
    <StepContainer 
      title="Review Learning Objectives"
      description="Here are the AI-generated learning objectives aligned with your goals and assessments using Bloom's Taxonomy:"
    >

      {approvedGoals.map((goal, goalIndex) => {
        const goalObjectives = refinedObjectives.filter(obj => obj.goalId === goal.id)
        const relatedAssessment = approvedAssessments.find(a => a.goalId === goal.id)
        const originalGoal = goals[goalIndex] // Get the original goal that user submitted
        const assessmentStrategies = relatedAssessment ? parseAssessmentText(relatedAssessment.description) : []
        
        // Debug logging
        if (relatedAssessment) {
          console.log('Assessment description:', relatedAssessment.description)
          console.log('Parsed strategies:', assessmentStrategies)
        }
        
        return (
          <div key={goal.id} className="objectives-review-section">
            <div className="goal-header">
              <h3>Goal {goalIndex + 1}: {originalGoal?.description || 'Unknown Goal'}</h3>
              <p className="goal-text">{goal.description}</p>
            </div>
            
            {relatedAssessment && (
              <details className="assessment-context collapsible">
                <summary className="assessment-summary-header">
                  <h4>Related Assessment Strategies</h4>
                  <span className="toggle-indicator">▼</span>
                </summary>
                <div className="assessment-strategies-content">
                  {assessmentStrategies.length > 1 ? (
                    <ul className="assessment-strategies-list">
                      {assessmentStrategies.map((strategy, index) => (
                        <li key={index} className="assessment-strategy-item">
                          {strategy.title ? (
                            <div className="strategy-with-title">
                              <div className="strategy-title">{strategy.title}</div>
                              <div className="strategy-description">{strategy.description}</div>
                            </div>
                          ) : (
                            <div className="strategy-full-text">{strategy.description}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : assessmentStrategies.length === 1 ? (
                    assessmentStrategies[0].title ? (
                      <div className="single-strategy-with-title">
                        <h5 className="single-strategy-title">{assessmentStrategies[0].title}</h5>
                        <div className="single-strategy-description">{assessmentStrategies[0].description}</div>
                      </div>
                    ) : (
                      <div className="assessment-text">{assessmentStrategies[0].description}</div>
                    )
                  ) : (
                    <div className="assessment-text">{relatedAssessment.description || 'No assessment description available'}</div>
                  )}
                </div>
              </details>
            )}
            
            <div className="learning-objectives">
              <h4>Learning Objectives:</h4>
              {goalObjectives.length > 0 ? (
                <ul className="objectives-list">
                  {goalObjectives.map((objective) => (
                    <li key={objective.id} className="objective-item">
                      <span className="bloom-level">{objective.bloomLevel}:</span>
                      <span className="objective-description">{objective.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-objectives">No objectives generated for this goal.</p>
              )}
            </div>
          </div>
        )
      })}

      <div className="confirmation-question">
        <h3>Are these learning objectives appropriate and measurable?</h3>
        <ButtonGroup>
          <button
            className="primary-button"
            onClick={approveLearningObjectives}
            disabled={isRefining}
          >
            {isRefining ? 'SAVING AND COMPLETING...' : 'SAVE AND CONTINUE'}
          </button>
          <button
            className="secondary-button"
            onClick={() => setCurrentStep('assessments')}
          >
            Revise Objectives
          </button>
        </ButtonGroup>
      </div>

      {isRefining && (
        <LoadingIndicator message={loadingMessage} progress={progress} />
      )}
    </StepContainer>
  )

  const renderObjectivesSaved = () => (
    <StepContainer 
      title="🎯 Complete Backward Design Framework!" 
      description="Congratulations! You have successfully completed the backward design process with aligned goals, assessments, and learning objectives."
    >

      {approvedGoals.map((goal, goalIndex) => {
        const goalObjectives = approvedObjectives.filter(obj => obj.goalId === goal.id)
        const relatedAssessment = approvedAssessments.find(a => a.goalId === goal.id)
        const originalGoal = goals[goalIndex] // Get the original goal that user submitted
        
        return (
          <div key={goal.id} className="complete-framework-section">
            <div className="goal-header">
              <h3>Goal {goalIndex + 1}: {originalGoal?.description || 'Unknown Goal'}</h3>
              <p className="goal-text">{goal.description}</p>
            </div>
            
            <div className="framework-components">
              {relatedAssessment && (
                <div className="assessment-component">
                  <h4>Assessment Strategy:</h4>
                  <p className="component-text">{relatedAssessment.description}</p>
                </div>
              )}
              
              <div className="objectives-component">
                <h4>Learning Objectives:</h4>
                {goalObjectives.length > 0 ? (
                  <ul className="objectives-list">
                    {goalObjectives.map((objective) => (
                      <li key={objective.id} className="objective-item">
                        <span className="bloom-level">{objective.bloomLevel}:</span>
                        <span className="objective-description">{objective.description}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-objectives">No objectives defined for this goal.</p>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <div className="completion-summary">
        <h3>Your Backward Design Framework is Complete!</h3>
        <p>✅ <strong>{approvedGoals.length}</strong> learning goals defined</p>
        <p>✅ <strong>{approvedAssessments.length}</strong> assessment strategies created</p>
        <p>✅ <strong>{approvedObjectives.length}</strong> learning objectives aligned</p>
      </div>

      <ButtonGroup>
        <button
          className="secondary-button"
          onClick={resetApp}
        >
          Create New Framework
        </button>
      </ButtonGroup>
    </StepContainer>
  )

  return (
    <div className="app-container">
      <header>
        <AppHeader 
          showHelp={showHelp}
          onToggleHelp={() => setShowHelp(!showHelp)}
        />
        <ProgressIndicator 
          onNavigateToStep={navigateToStep}
          canNavigateToStep={canNavigateToStepCheck}
          getStepStatus={getStepStatusCheck}
        />
      </header>

      <main>
        <ErrorBoundary onError={(error, errorInfo, errorId) => {
          // Log error for debugging
          console.error('App Error Boundary caught error:', {
            error,
            errorInfo,
            errorId,
            timestamp: new Date().toISOString()
          })
        }}>
          <HelpPanel 
            currentStep={currentStep}
            isVisible={showHelp}
            onClose={() => setShowHelp(false)}
          />
          
          {currentStep === 'intro' && renderIntro()}
          {currentStep === 'goals' && renderGoals()}
          {currentStep === 'review-goals' && renderApprove()}
          {currentStep === 'assessments' && renderAssessments()}
          {currentStep === 'review-objectives' && isRefining && (
            <StepContainer 
              title="Generating Learning Objectives..." 
              description="Please wait while we create learning objectives aligned with your goals and assessments using Bloom's Taxonomy..."
            >
              <LoadingIndicator message={loadingMessage} progress={progress} />
            </StepContainer>
          )}
          {currentStep === 'review-objectives' && !isRefining && renderObjectivesReview()}
          {currentStep === 'complete' && renderObjectivesSaved()}
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App
