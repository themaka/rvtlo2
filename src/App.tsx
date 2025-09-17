import { useState, useEffect, useCallback } from 'react'
import type { 
  Goal, 
  Assessment, 
  LearningObjective, 
  Step
} from './types'
import { 
  validateAndConfirmSubject,
  validateAndCompleteSetup,
  validateAndAddGoal 
} from './utils/validation'
import { 
  refineGoalsWithAI as refineGoalsService,
  generateAssessments as generateAssessmentsService,
  generateLearningObjectives as generateLearningObjectivesService,
  type CourseContext
} from './services/aiService'
import './App.css'

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('intro')
  const [courseType, setCourseType] = useState<'course' | 'workshop' | null>(null)
  const [courseSubject, setCourseSubject] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [instructionDuration, setInstructionDuration] = useState('')
  const [isSubjectConfirmed, setIsSubjectConfirmed] = useState(false)
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [currentGoal, setCurrentGoal] = useState('')
  const [refinedGoals, setRefinedGoals] = useState<Goal[]>([])
  const [approvedGoals, setApprovedGoals] = useState<Goal[]>([])
  const [refinedAssessments, setRefinedAssessments] = useState<Assessment[]>([])
  const [approvedAssessments, setApprovedAssessments] = useState<Assessment[]>([])
  const [refinedObjectives, setRefinedObjectives] = useState<LearningObjective[]>([])
  const [approvedObjectives, setApprovedObjectives] = useState<LearningObjective[]>([])
  const [isRefining, setIsRefining] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({})
  const [showHelp, setShowHelp] = useState(false)

  const addGoal = () => {
    return validateAndAddGoal(currentGoal, goals, {
      setInputErrors,
      setError,
      setGoals,
      setCurrentGoal
    })
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

  const approveAssessments = () => {
    setApprovedAssessments(refinedAssessments)
    setCurrentStep('assessment-saved')
  }

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
  }, [approvedGoals, approvedAssessments, courseType, courseSubject, targetAudience, instructionDuration])

  // Trigger learning objectives generation when step changes
  useEffect(() => {
    if (currentStep === 'learning-objectives') {
      generateLearningObjectives()
    }
  }, [currentStep, generateLearningObjectives])

  const approveLearningObjectives = () => {
    setApprovedObjectives(refinedObjectives)
    setCurrentStep('objectives-saved')
  }

  // Helper function to parse and format assessment strategies
  const parseAssessmentStrategies = (description: string) => {
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
  }

  const approveGoals = () => {
    setApprovedGoals(refinedGoals)
    setCurrentStep('saved')
  }

  const getStepStatus = (step: string) => {
    const stepOrder = ['intro', 'goals', 'approve', 'saved', 'assessments', 'assessment-review', 'assessment-saved', 'learning-objectives', 'objectives-review', 'objectives-saved']
    const currentIndex = stepOrder.indexOf(currentStep)
    const stepIndex = stepOrder.indexOf(step)
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'active'
    return 'upcoming'
  }

  const canNavigateToStep = (targetStep: Step) => {
    // Define navigation rules
    switch (targetStep) {
      case 'intro':
        return true
      case 'goals':
        return courseType && isSubjectConfirmed && isSetupComplete
      case 'approve':
        return goals.length > 0
      case 'saved':
        return approvedGoals.length > 0
      case 'assessments':
        return approvedGoals.length > 0
      case 'assessment-review':
        return refinedAssessments.length > 0
      case 'assessment-saved':
        return approvedAssessments.length > 0
      case 'learning-objectives':
        return approvedGoals.length > 0 && approvedAssessments.length > 0
      case 'objectives-review':
        return refinedObjectives.length > 0
      case 'objectives-saved':
        return approvedObjectives.length > 0
      default:
        return false
    }
  }

  const navigateToStep = (targetStep: Step) => {
    if (canNavigateToStep(targetStep)) {
      setError('')
      setCurrentStep(targetStep)
    }
  }

  const getHelpContent = (step: Step) => {
    const helpContent = {
      intro: {
        title: "Getting Started",
        content: [
          "Choose between 'Course' for semester-long classes or 'Workshop' for shorter training sessions.",
          "Be specific with your subject (e.g., 'Intro to Data Science' rather than just 'Computer Science').",
          "This helps the AI provide more targeted suggestions for your goals and assessments."
        ]
      },
      goals: {
        title: "Writing Effective Goals",
        content: [
          "Focus on student outcomes, not instructor activities (e.g., 'Students will analyze...' not 'I will teach...').",
          "Think big picture - these are overarching aims for your entire course/workshop.",
          "Examples: 'Students will develop critical thinking skills in evaluating scientific claims'",
          "You can add 2-5 goals. Don't worry about perfect wording - the AI will help refine them!"
        ]
      },
      approve: {
        title: "Reviewing AI Refinements",
        content: [
          "The AI has made your goals more specific and measurable.",
          "Check that the refined goals still capture your original intent.",
          "Refined goals should use action verbs and be observable/measurable.",
          "If you're not satisfied, you can go back and revise your original goals."
        ]
      },
      assessments: {
        title: "Assessment Design",
        content: [
          "Assessments should directly measure achievement of your goals.",
          "Look for a mix of formative (ongoing) and summative (final) assessments.",
          "Authentic assessments connect to real-world applications of learning.",
          "The AI will suggest multiple options - you'll review them next."
        ]
      },
      'learning-objectives': {
        title: "Learning Objectives & Bloom's Taxonomy",
        content: [
          "Learning objectives are specific, measurable steps toward achieving your goals.",
          "They use action verbs from Bloom's Taxonomy (Remember, Understand, Apply, Analyze, Evaluate, Create).",
          "Each objective should be directly assessable using your chosen assessment methods.",
          "Objectives provide the detailed roadmap for daily lesson planning."
        ]
      }
    }
    
    return helpContent[step as keyof typeof helpContent] || null
  }

  const renderHelpPanel = () => {
    const helpContent = getHelpContent(currentStep)
    if (!helpContent || !showHelp) return null
    
    return (
      <div className="help-panel">
        <div className="help-header">
          <h4>💡 {helpContent.title}</h4>
          <button 
            className="help-close"
            onClick={() => setShowHelp(false)}
            aria-label="Close help"
          >
            ×
          </button>
        </div>
        <div className="help-content">
          <ul>
            {helpContent.content.map((tip: string, index: number) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const resetApp = () => {
    setCurrentStep('intro')
    setCourseType(null)
    setCourseSubject('')
    setTargetAudience('')
    setInstructionDuration('')
    setIsSubjectConfirmed(false)
    setIsSetupComplete(false)
    setGoals([])
    setCurrentGoal('')
    setRefinedGoals([])
    setApprovedGoals([])
    setRefinedAssessments([])
    setApprovedAssessments([])
  }

  const renderIntro = () => (
    <div className="step-container">
      <h2>Welcome to the Course Goal Builder</h2>
      <p>This tool will help you define clear, actionable goals for your {courseType || 'course/workshop'} using backward design principles.</p>

      {!courseType ? (
        <div className="selection-container">
          <h3>What type of instruction are you planning?</h3>
          <div className="button-group">
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
          </div>
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

          <div className="button-group">
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
          </div>
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

          <div className="button-group">
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
          </div>
        </div>
      ) : (
        <div className="confirmation-container">
          <h3>Setup Complete</h3>
          <p><strong>Type:</strong> {courseType}</p>
          <p><strong>Subject:</strong> {courseSubject}</p>
          <p><strong>Target Audience:</strong> {targetAudience}</p>
          <p><strong>Duration:</strong> {instructionDuration}</p>
          <div className="button-group">
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
          </div>
        </div>
      )}
    </div>
  )

  const renderGoals = () => {
    console.log('Rendering goals component with goals state:', goals);
    return (
    <div className="step-container">
      <h2>Define Your High-Level Goals</h2>
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

      <div className="button-group">
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
      </div>

      {isRefining && (
        <div className="loading-indicator">
          <div className="loading-header">
            <div className="loading-spinner"></div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
          <div className="loading-bar">
            <div className="loading-progress" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
    );
  }

  const renderApprove = () => (
    <div className="step-container">
      <h2>Review Refined Goals</h2>
      <p>Here's how Claude has refined your goals to make them more specific and actionable:</p>

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
        <div className="button-group">
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
        </div>
      </div>
    </div>
  )

  const renderSaved = () => (
    <div className="step-container">
      <h2>✅ Goals Saved Successfully!</h2>
      <p>Your refined learning goals have been saved and are ready for the next steps in backward design.</p>

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

      <div className="button-group">
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
      </div>
    </div>
  )

  const renderAssessments = () => (
    <div className="step-container">
      <h2>Design Assessment Strategies</h2>
      <p>Now let's develop assessment strategies for each of your learning goals. The AI will suggest multiple assessment options for each goal.</p>

      <div className="saved-goals">
        <h3>Your Learning Goals:</h3>
        {approvedGoals.map((goal, index) => (
          <div key={goal.id} className="saved-goal-item">
            <strong>Goal {index + 1}:</strong> <span>{goal.description}</span>
          </div>
        ))}
      </div>

      <div className="button-group">
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
      </div>

      {isRefining && (
        <div className="loading-indicator">
          <div className="loading-header">
            <div className="loading-spinner"></div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
          <div className="loading-bar">
            <div className="loading-progress" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  )

  const renderAssessmentReview = () => (
    <div className="step-container">
      <h2>Review Assessment Strategies</h2>
      <p>Here are the AI-generated assessment strategies for each of your learning goals:</p>

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
        <div className="button-group">
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
        </div>
      </div>
    </div>
  )

  const renderAssessmentSaved = () => (
    <div className="step-container">
      <h2>✅ Assessment Strategies Saved!</h2>
      <p>Your assessment strategies have been saved and are ready for the next phase of backward design.</p>

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

      <div className="button-group">
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
      </div>

      {isRefining && (
        <div className="loading-indicator">
          <div className="loading-header">
            <div className="loading-spinner"></div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
          <div className="loading-bar">
            <div className="loading-progress" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  )

  const renderObjectivesReview = () => (
    <div className="step-container">
      <h2>Review Learning Objectives</h2>
      <p>Here are the AI-generated learning objectives aligned with your goals and assessments using Bloom's Taxonomy:</p>

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
        <div className="button-group">
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
        </div>
      </div>
    </div>
  )

  const renderObjectivesSaved = () => (
    <div className="step-container">
      <h2>🎯 Complete Backward Design Framework!</h2>
      <p>Congratulations! You have successfully completed the backward design process with aligned goals, assessments, and learning objectives.</p>

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

      <div className="button-group">
        <button
          className="secondary-button"
          onClick={resetApp}
        >
          Create New Framework
        </button>
      </div>
    </div>
  )

  return (
    <div className="app-container">
      <header>
        <div className="header-content">
          <div className="header-left">
            <h1>Course Goal Builder</h1>
          </div>
          <div className="header-right">
            <button 
              className="help-button"
              onClick={() => setShowHelp(!showHelp)}
              aria-label="Toggle help"
            >
              {showHelp ? '✕ Close Help' : '? Help'}
            </button>
          </div>
        </div>
        <div className="progress-indicator">
          <span 
            className={getStepStatus('intro')}
            onClick={() => navigateToStep('intro')}
            style={{ cursor: canNavigateToStep('intro') ? 'pointer' : 'default' }}
          >
            1. Setup
          </span>
          <span 
            className={getStepStatus('goals')}
            onClick={() => navigateToStep('goals')}
            style={{ cursor: canNavigateToStep('goals') ? 'pointer' : 'default' }}
          >
            2. Goals
          </span>
          <span 
            className={getStepStatus('approve')}
            onClick={() => navigateToStep('approve')}
            style={{ cursor: canNavigateToStep('approve') ? 'pointer' : 'default' }}
          >
            3. Review
          </span>
          <span 
            className={getStepStatus('saved')}
            onClick={() => navigateToStep('saved')}
            style={{ cursor: canNavigateToStep('saved') ? 'pointer' : 'default' }}
          >
            4. Goals Complete
          </span>
          <span 
            className={getStepStatus('assessments')}
            onClick={() => navigateToStep('assessments')}
            style={{ cursor: canNavigateToStep('assessments') ? 'pointer' : 'default' }}
          >
            5. Assessments
          </span>
          <span 
            className={getStepStatus('assessment-review')}
            onClick={() => navigateToStep('assessment-review')}
            style={{ cursor: canNavigateToStep('assessment-review') ? 'pointer' : 'default' }}
          >
            6. Review
          </span>
          <span 
            className={getStepStatus('assessment-saved')}
            onClick={() => navigateToStep('assessment-saved')}
            style={{ cursor: canNavigateToStep('assessment-saved') ? 'pointer' : 'default' }}
          >
            7. Assessment Complete
          </span>
          <span 
            className={getStepStatus('learning-objectives')}
            onClick={() => navigateToStep('learning-objectives')}
            style={{ cursor: canNavigateToStep('learning-objectives') ? 'pointer' : 'default' }}
          >
            8. Learning Objectives
          </span>
          <span 
            className={getStepStatus('objectives-review')}
            onClick={() => navigateToStep('objectives-review')}
            style={{ cursor: canNavigateToStep('objectives-review') ? 'pointer' : 'default' }}
          >
            9. Review
          </span>
          <span 
            className={getStepStatus('objectives-saved')}
            onClick={() => navigateToStep('objectives-saved')}
            style={{ cursor: canNavigateToStep('objectives-saved') ? 'pointer' : 'default' }}
          >
            10. Complete
          </span>
        </div>
      </header>

      <main>
        {renderHelpPanel()}
        
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'goals' && renderGoals()}
        {currentStep === 'approve' && renderApprove()}
        {currentStep === 'saved' && renderSaved()}
        {currentStep === 'assessments' && renderAssessments()}
        {currentStep === 'assessment-review' && renderAssessmentReview()}
        {currentStep === 'assessment-saved' && renderAssessmentSaved()}
        {currentStep === 'learning-objectives' && (
          <div className="step-container">
            <h2>Generating Learning Objectives...</h2>
            <p>Please wait while we create learning objectives aligned with your goals and assessments using Bloom's Taxonomy...</p>
            {isRefining && (
              <div className="loading-indicator">
                <div className="loading-bar">
                  <div className="loading-progress" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="loading-message">{loadingMessage}</p>
              </div>
            )}
          </div>
        )}
        {currentStep === 'objectives-review' && renderObjectivesReview()}
        {currentStep === 'objectives-saved' && renderObjectivesSaved()}
      </main>
    </div>
  )
}

export default App
