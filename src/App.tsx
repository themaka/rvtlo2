import { useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import './App.css'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

interface Goal {
  id: number
  description: string
  isRefined?: boolean
}

type Step = 'intro' | 'goals' | 'refine' | 'approve' | 'saved'

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('intro')
  const [courseType, setCourseType] = useState<'course' | 'workshop' | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [currentGoal, setCurrentGoal] = useState('')
  const [refinedGoals, setRefinedGoals] = useState<Goal[]>([])
  const [approvedGoals, setApprovedGoals] = useState<Goal[]>([])
  const [isRefining, setIsRefining] = useState(false)

  const addGoal = () => {
    if (currentGoal.trim()) {
      const newGoal: Goal = {
        id: Date.now(),
        description: currentGoal.trim()
      }
      console.log('Adding new goal:', newGoal);
      setGoals(prev => {
        const updatedGoals = [...prev, newGoal];
        console.log('Updated goals array:', updatedGoals);
        return updatedGoals;
      });
      setCurrentGoal('');
    }
  }

  const removeGoal = (id: number) => {
    setGoals(prev => prev.filter(goal => goal.id !== id))
  }

  const refineGoalsWithAI = async () => {
    if (goals.length === 0) return

    setIsRefining(true)
    try {
      const goalsText = goals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')

      const prompt = `I have these initial goals for a ${courseType}:

${goalsText}

Please help me refine these goals to make them more specific, measurable, and aligned with effective ${courseType} design principles.

For each original goal, provide a refined version. Format your response exactly like this:

REFINED GOAL 1: [Your refined version of the first goal]
REFINED GOAL 2: [Your refined version of the second goal]
REFINED GOAL 3: [Your refined version of the third goal]

Make each refined goal clear, actionable, and focused on student outcomes.`

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })

      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''
      console.log('AI Response:', aiResponse) // Debug logging

      // Parse AI response and create refined goals
      const refinedGoalsList: Goal[] = []
      const lines = aiResponse.split('\n').filter(line => line.trim())

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        // Look for lines that start with "REFINED GOAL X:"
        const refinedGoalMatch = line.match(/^REFINED GOAL \d+:\s*(.+)$/i)
        if (refinedGoalMatch) {
          const goalText = refinedGoalMatch[1].trim()
          if (goalText) {
            refinedGoalsList.push({
              id: Date.now() + i,
              description: goalText,
              isRefined: true
            })
          }
        }
      }

      // If no goals were parsed, fall back to original goals
      if (refinedGoalsList.length === 0) {
        console.log('No refined goals parsed, using original goals')
        setRefinedGoals(goals.map(goal => ({ ...goal, isRefined: true })))
      } else {
        console.log('Parsed refined goals:', refinedGoalsList)
        setRefinedGoals(refinedGoalsList)
      }

      setCurrentStep('approve')
    } catch (error) {
      console.error('Error refining goals:', error)
      // Fallback to original goals if AI fails
      setRefinedGoals(goals.map(goal => ({ ...goal, isRefined: true })))
      setCurrentStep('approve')
    } finally {
      setIsRefining(false)
    }
  }

  const approveGoals = () => {
    setApprovedGoals(refinedGoals)
    setCurrentStep('saved')
  }

  const resetApp = () => {
    setCurrentStep('intro')
    setCourseType(null)
    setGoals([])
    setCurrentGoal('')
    setRefinedGoals([])
    setApprovedGoals([])
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
      ) : (
        <div className="confirmation-container">
          <p>You selected: <strong>{courseType}</strong></p>
          <div className="button-group">
            <button
              className="primary-button"
              onClick={() => setCurrentStep('goals')}
            >
              Continue
            </button>
            <button
              className="secondary-button"
              onClick={() => setCourseType(null)}
            >
              Change Selection
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
      <p>What are the overarching goals for this {courseType}? Think about the big picture outcomes you want to achieve.</p>
      <p className="instruction">Add your initial goals - we'll refine them together:</p>

      <div className="goal-input">
        <input
          type="text"
          value={currentGoal}
          onChange={(e) => setCurrentGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          placeholder="e.g., Improve students' critical thinking skills..."
        />
        <button
          className="add-button"
          onClick={addGoal}
          disabled={!currentGoal.trim()}
        >
          Add Goal
        </button>
      </div>

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
    </div>
    );
  }

  const renderApprove = () => (
    <div className="step-container">
      <h2>Review Refined Goals</h2>
      <p>Here's how Claude has refined your goals to make them more specific and actionable:</p>

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
        <h3>Saved Goals for your {courseType}:</h3>
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
          onClick={resetApp}
        >
          Create New Goals
        </button>
      </div>
    </div>
  )

  return (
    <div className="app-container">
      <header>
        <h1>Course Goal Builder</h1>
        <div className="progress-indicator">
          <span className={currentStep === 'intro' ? 'active' : 'completed'}>1. Setup</span>
          <span className={currentStep === 'goals' ? 'active' : currentStep === 'intro' ? '' : 'completed'}>2. Goals</span>
          <span className={currentStep === 'approve' ? 'active' : currentStep === 'saved' ? 'completed' : ''}>3. Review</span>
          <span className={currentStep === 'saved' ? 'active' : ''}>4. Complete</span>
        </div>
      </header>

      <main>
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'goals' && renderGoals()}
        {currentStep === 'approve' && renderApprove()}
        {currentStep === 'saved' && renderSaved()}
      </main>
    </div>
  )
}

export default App
