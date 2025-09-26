import { useEffect, useCallback, useMemo } from 'react'
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

  const generateAssessments = async () => {
    if (!courseType) return // Guard against null courseType
    
    const context: CourseContext = {
      courseType,
      courseSubject,
      targetAudience,
      instructionDuration
    }

    await generateAssessmentsService(approvedGoals, context, {
      setIsRefining,
      setLoadingMessage,
      setProgress,
      setError,
      setCurrentStep,
      setRefinedAssessments
    })
  }

  const approveAssessments = useCallback(() => {
    setApprovedAssessments(refinedAssessments)
    setCurrentStep('assessment-saved')
  }, [refinedAssessments, setApprovedAssessments, setCurrentStep])

  const generateLearningObjectives = useCallback(async () => {
    if (!courseType || approvedGoals.length === 0 || approvedAssessments.length === 0) return

    const context: CourseContext = {
      courseType,
      courseSubject,
      targetAudience,
      instructionDuration
    }

    await generateLearningObjectivesService(
      approvedGoals,
      approvedAssessments,
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

  // Trigger learning objectives generation when step changes
  useEffect(() => {
    if (currentStep === 'learning-objectives') {
      generateLearningObjectives()
    }
  }, [currentStep, generateLearningObjectives])

  const approveLearningObjectives = useCallback(() => {
    setApprovedObjectives(refinedObjectives)
    setCurrentStep('objectives-saved')
  }, [refinedObjectives, setApprovedObjectives, setCurrentStep])

  // Helper function to parse and format assessment strategies
  const parseAssessmentStrategies = useCallback((description: string) => {
    // First, try simple semicolon or bullet point splitting
    let strategies = description
      .split(/[;•]/) // Split on semicolons or bullet points
      .map(item => item.trim())
      .filter(item => item.length > 5) // More lenient filter
    
    // If that doesn't work, try sentence-based splitting
    if (strategies.length <= 1) {
      strategies = description
        .split(/\.\s+(?=[A-Z])/) // Split on periods followed by capital letters
        .map(item => item.trim())
        .filter(item => item.length > 10)
        .map(item => item.endsWith('.') ? item : item + '.')
    }
    
    // If still no good split, just return the original as a single item
    if (strategies.length <= 1) {
      return [description]
    }
    
    // Clean up the strategies
    return strategies.map(item => {
      let cleaned = item.replace(/^[•\-*]\s*/, '') // Remove bullet points
      if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
        cleaned += '.'
      }
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    })
  }, [])

  const approveGoals = useCallback(() => {
    setApprovedGoals(refinedGoals)
    setCurrentStep('saved')
  }, [refinedGoals, setApprovedGoals, setCurrentStep])

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

      <div className="refined-goals">
        {refinedGoals.map((goal, index) => (
          <div key={goal.id} className="refined-goal-item">
            <strong>Refined Goal {index + 1}:</strong>
            <p>{goal.description}</p>
          </div>
        ))}
      </div>

      <div className="original-goals">
        <h3>Your Original Goals:</h3>
        {goals.map((goal, index) => (
          <div key={goal.id} className="original-goal-item">
            <strong>Original {index + 1}:</strong> {goal.description}
          </div>
        ))}
      </div>

      <div className="confirmation-question">
        <h3>Are you happy with these refined goals?</h3>
        <ButtonGroup>
          <button
            className="primary-button"
            onClick={approveGoals}
          >
            Yes, Save These Goals
          </button>
          <button
            className="secondary-button"
            onClick={() => setCurrentStep('goals')}
          >
            No, Let Me Revise Them
          </button>
        </ButtonGroup>
      </div>
    </StepContainer>
  )

  const renderSaved = () => (
    <StepContainer 
      title="✅ Goals Saved Successfully!"
      description="Your refined learning goals have been saved and are ready for the next steps in backward design."
    >

      <div className="saved-goals">
        <h3>Saved Goals for your {courseType} on {courseSubject}:</h3>
        {approvedGoals.map((goal, index) => (
          <div key={goal.id} className="saved-goal-item">
            <strong>Goal {index + 1}:</strong> <span>{goal.description || "Goal text missing"}</span>
          </div>
        ))}
      </div>

      <div className="next-steps">
        <p><em>Next: Assessment strategies will be developed based on these goals...</em></p>
      </div>

      <ButtonGroup>
        <button
          className="primary-button"
          onClick={() => setCurrentStep('assessments')}
        >
          Continue to Assessment Strategies
        </button>
        <button
          className="secondary-button"
          onClick={resetApp}
        >
          Start Over
        </button>
      </ButtonGroup>
    </StepContainer>
  )

  const renderAssessments = () => (
    <StepContainer 
      title="Design Assessment Strategies"
      description="Now let's develop assessment strategies for each of your learning goals. The AI will suggest multiple assessment options for each goal."
    >

      <div className="saved-goals">
        <h3>Your Learning Goals:</h3>
        {approvedGoals.map((goal, index) => (
          <div key={goal.id} className="saved-goal-item">
            <strong>Goal {index + 1}:</strong> <span>{goal.description}</span>
          </div>
        ))}
      </div>

      <ButtonGroup>
        <button
          className="secondary-button"
          onClick={() => setCurrentStep('saved')}
        >
          Back to Goals
        </button>
        <button
          className="primary-button"
          onClick={generateAssessments}
          disabled={isRefining}
        >
          {isRefining ? 'Generating Assessment Strategies...' : 'Generate Assessment Strategies'}
        </button>
      </ButtonGroup>

      {isRefining && (
        <LoadingIndicator message={loadingMessage} progress={progress} />
      )}
    </StepContainer>
  )

  const renderAssessmentReview = () => (
    <StepContainer 
      title="Review Assessment Strategies"
      description="Here are the AI-generated assessment strategies for each of your learning goals:"
    >

      {refinedAssessments.map((assessment, index) => {
        const correspondingGoal = approvedGoals.find(goal => goal.id === assessment.goalId)
        const strategies = parseAssessmentStrategies(assessment.description)
        
        // Debug logging
        console.log('Assessment description:', assessment.description)
        console.log('Parsed strategies:', strategies)
        
        return (
          <div key={assessment.id} className="assessment-review-section">
            <div className="goal-header">
              <h3>Goal {index + 1}</h3>
              <p className="goal-text">{correspondingGoal?.description}</p>
            </div>
            
            <div className="assessment-strategies">
              <h4>Assessment Strategies:</h4>
              {strategies.length > 1 ? (
                <ul className="strategy-list">
                  {strategies.map((strategy, strategyIndex) => (
                    <li key={strategyIndex} className="strategy-item">
                      {strategy}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="single-strategy">
                  <p>{assessment.description}</p>
                </div>
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
          >
            Save Assessments
          </button>
          <button
            className="secondary-button"
            onClick={() => setCurrentStep('assessments')}
          >
            Revise Assessments
          </button>
        </ButtonGroup>
      </div>
    </StepContainer>
  )

  const renderAssessmentSaved = () => (
    <StepContainer 
      title="✅ Assessment Strategies Saved!"
      description="Your assessment strategies have been saved and are ready for the next phase of backward design."
    >

      {approvedAssessments.map((assessment, index) => {
        const correspondingGoal = approvedGoals.find(goal => goal.id === assessment.goalId)
        const strategies = parseAssessmentStrategies(assessment.description)
        
        return (
          <div key={assessment.id} className="assessment-saved-section">
            <div className="goal-header">
              <h3>Goal {index + 1}</h3>
              <p className="goal-text">{correspondingGoal?.description}</p>
            </div>
            
            <div className="assessment-strategies">
              <h4>Assessment Strategies:</h4>
              {strategies.length > 1 ? (
                <ul className="strategy-list">
                  {strategies.map((strategy, strategyIndex) => (
                    <li key={strategyIndex} className="strategy-item">
                      {strategy}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="single-strategy">
                  <p>{assessment.description}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}

      <div className="next-steps">
        <p><em>Next: Learning objectives will be developed to support these goals and assessments...</em></p>
      </div>

      <ButtonGroup>
        <button
          className="primary-button"
          onClick={generateLearningObjectives}
          disabled={isRefining}
        >
          {isRefining ? 'Generating Learning Objectives...' : 'Continue to Learning Objectives'}
        </button>
        <button
          className="secondary-button"
          onClick={resetApp}
        >
          Start Over
        </button>
      </ButtonGroup>

      {isRefining && (
        <LoadingIndicator message={loadingMessage} progress={progress} />
      )}
    </StepContainer>
  )

  const renderObjectivesReview = () => (
    <StepContainer 
      title="Review Learning Objectives"
      description="Here are the AI-generated learning objectives aligned with your goals and assessments using Bloom's Taxonomy:"
    >

      {approvedGoals.map((goal, goalIndex) => {
        const goalObjectives = refinedObjectives.filter(obj => obj.goalId === goal.id)
        const relatedAssessment = approvedAssessments.find(a => a.goalId === goal.id)
        
        return (
          <div key={goal.id} className="objectives-review-section">
            <div className="goal-header">
              <h3>Goal {goalIndex + 1}</h3>
              <p className="goal-text">{goal.description}</p>
            </div>
            
            {relatedAssessment && (
              <div className="assessment-context">
                <h4>Related Assessment:</h4>
                <p className="assessment-summary">{relatedAssessment.description.substring(0, 150)}...</p>
              </div>
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
          >
            Save Learning Objectives
          </button>
          <button
            className="secondary-button"
            onClick={() => setCurrentStep('assessment-saved')}
          >
            Revise Objectives
          </button>
        </ButtonGroup>
      </div>
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
        
        return (
          <div key={goal.id} className="complete-framework-section">
            <div className="goal-header">
              <h3>Goal {goalIndex + 1}</h3>
              <p className="goal-text">{goal.description}</p>
            </div>
            
            <div className="framework-components">
              {relatedAssessment && (
                <div className="assessment-component">
                  <h4>Assessment Strategy:</h4>
                  <p className="component-text">{relatedAssessment.description.substring(0, 200)}...</p>
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
          {currentStep === 'approve' && renderApprove()}
          {currentStep === 'saved' && renderSaved()}
          {currentStep === 'assessments' && renderAssessments()}
          {currentStep === 'assessment-review' && renderAssessmentReview()}
          {currentStep === 'assessment-saved' && renderAssessmentSaved()}
          {currentStep === 'learning-objectives' && (
            <StepContainer 
              title="Generating Learning Objectives..." 
              description="Please wait while we create learning objectives aligned with your goals and assessments using Bloom's Taxonomy..."
            >
              {isRefining && (
                <LoadingIndicator message={loadingMessage} progress={progress} />
              )}
            </StepContainer>
          )}
          {currentStep === 'objectives-review' && renderObjectivesReview()}
          {currentStep === 'objectives-saved' && renderObjectivesSaved()}
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default App
