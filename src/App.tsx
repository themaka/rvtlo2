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

interface Assessment {
  id: number
  goalId: number
  description: string
  isRefined?: boolean
}

type Step = 'intro' | 'goals' | 'refine' | 'approve' | 'saved' | 'assessments' | 'assessment-review' | 'assessment-saved'

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('intro')
  const [courseType, setCourseType] = useState<'course' | 'workshop' | null>(null)
  const [courseSubject, setCourseSubject] = useState('')
  const [isSubjectConfirmed, setIsSubjectConfirmed] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [currentGoal, setCurrentGoal] = useState('')
  const [refinedGoals, setRefinedGoals] = useState<Goal[]>([])
  const [approvedGoals, setApprovedGoals] = useState<Goal[]>([])
  const [refinedAssessments, setRefinedAssessments] = useState<Assessment[]>([])
  const [approvedAssessments, setApprovedAssessments] = useState<Assessment[]>([])
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

      const prompt = `I have these initial goals for a ${courseType} on "${courseSubject}":

${goalsText}

Please help me refine these goals to make them more specific, measurable, and aligned with effective ${courseType} design principles for the subject of ${courseSubject}.

Important guidelines for refining:
- Be suggestive rather than prescriptive
- Avoid dictating specific vocabulary terms or specific issues that must be addressed
- Use flexible language like "some examples are...", "possibly including...", "such as...", or "which may include..."
- Focus on learning outcomes and measurable behaviors rather than exact content requirements
- Allow for instructor flexibility in implementation

For each original goal, provide a refined version. Format your response exactly like this:

REFINED GOAL 1: [Your refined version of the first goal]
REFINED GOAL 2: [Your refined version of the second goal]
REFINED GOAL 3: [Your refined version of the third goal]

Make each refined goal clear, actionable, and focused on student outcomes specific to ${courseSubject}, while maintaining flexibility in how the goal can be achieved.`

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

  const generateAssessments = async () => {
    if (approvedGoals.length === 0) return

    setIsRefining(true)
    try {
      const goalsText = approvedGoals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')

      const prompt = `I have these approved learning goals for a ${courseType} on "${courseSubject}":

${goalsText}

Please suggest specific, practical assessment strategies for each goal. Focus on authentic, meaningful ways to assess student achievement.

Important guidelines:
- Provide 2-3 specific assessment options for each goal
- Use flexible language like "consider...", "options might include...", "could be assessed through..."
- Include both formative (ongoing) and summative (final) assessment methods
- Focus on authentic assessment that connects to real-world application
- Consider the ${courseType} format and time constraints
- Suggest assessments that provide actionable feedback to students

For each goal, provide detailed assessment suggestions. Format your response EXACTLY like this:

ASSESSMENT FOR GOAL 1: [Provide 2-3 specific assessment methods for goal 1, separated by semicolons or bullet points]

ASSESSMENT FOR GOAL 2: [Provide 2-3 specific assessment methods for goal 2, separated by semicolons or bullet points]

ASSESSMENT FOR GOAL 3: [Provide 2-3 specific assessment methods for goal 3, separated by semicolons or bullet points]

Make each assessment suggestion concrete, practical, and directly aligned with measuring the specific goal for ${courseSubject}.`

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })

      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''
      console.log('AI Assessment Response:', aiResponse)

      // Parse AI response and create assessment suggestions
      const assessmentsList: Assessment[] = []
      const lines = aiResponse.split('\n').filter(line => line.trim())

      let currentGoalIndex = -1
      let currentAssessmentText = ''

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for assessment headers (more flexible matching)
        const assessmentMatch = line.match(/^ASSESSMENT\s+FOR\s+GOAL\s+(\d+):\s*(.*)$/i)
        
        if (assessmentMatch) {
          // Save previous assessment if we have one
          if (currentGoalIndex >= 0 && currentAssessmentText.trim()) {
            assessmentsList.push({
              id: Date.now() + currentGoalIndex,
              goalId: approvedGoals[currentGoalIndex].id,
              description: currentAssessmentText.trim(),
              isRefined: true
            })
          }
          
          // Start new assessment
          currentGoalIndex = parseInt(assessmentMatch[1]) - 1
          currentAssessmentText = assessmentMatch[2] || ''
        } else if (currentGoalIndex >= 0 && line) {
          // Continue building the current assessment text
          currentAssessmentText += (currentAssessmentText ? ' ' : '') + line
        }
      }

      // Don't forget the last assessment
      if (currentGoalIndex >= 0 && currentAssessmentText.trim() && currentGoalIndex < approvedGoals.length) {
        assessmentsList.push({
          id: Date.now() + currentGoalIndex,
          goalId: approvedGoals[currentGoalIndex].id,
          description: currentAssessmentText.trim(),
          isRefined: true
        })
      }

      // If no assessments were parsed, create meaningful fallback assessments
      if (assessmentsList.length === 0) {
        console.log('No assessments parsed, creating subject-specific fallback assessments')
        approvedGoals.forEach((goal, index) => {
          let fallbackAssessment = ''
          
          // Create subject-specific fallback based on course subject
          const subjectLower = courseSubject.toLowerCase()
          
          if (subjectLower.includes('3d print') || subjectLower.includes('printing')) {
            fallbackAssessment = `Consider practical assessments such as: hands-on printing projects with quality evaluation rubrics; troubleshooting scenarios with documented solutions; design challenges with peer review sessions; and portfolio documentation of print settings and outcomes.`
          } else if (subjectLower.includes('program') || subjectLower.includes('coding') || subjectLower.includes('software')) {
            fallbackAssessment = `Options might include: code review sessions with rubric-based evaluation; project-based assignments with real-world applications; peer programming exercises; and portfolio presentations demonstrating problem-solving approaches.`
          } else if (subjectLower.includes('design') || subjectLower.includes('creative')) {
            fallbackAssessment = `Could be assessed through: portfolio reviews with self-reflection components; peer critique sessions using structured feedback forms; design challenges with iterative improvement documentation; and presentation of creative process and final outcomes.`
          } else if (subjectLower.includes('science') || subjectLower.includes('biology') || subjectLower.includes('chemistry')) {
            fallbackAssessment = `Assessment strategies might include: laboratory practical examinations; research project presentations; peer-reviewed lab reports; and concept mapping exercises with real-world applications.`
          } else if (subjectLower.includes('math') || subjectLower.includes('statistics')) {
            fallbackAssessment = `Consider assessments such as: problem-solving portfolios with step-by-step explanations; peer tutoring sessions with documented teaching strategies; real-world application projects; and reflective journals on mathematical thinking processes.`
          } else if (subjectLower.includes('writing') || subjectLower.includes('english') || subjectLower.includes('literature')) {
            fallbackAssessment = `Options could include: peer review workshops with structured feedback forms; portfolio development with revision documentation; collaborative writing projects; and presentation of writing process and final products.`
          } else {
            // Generic but still more useful than before
            fallbackAssessment = `Assessment approaches might include: formative check-ins through peer discussions and self-reflection exercises; summative evaluation through project-based demonstrations or portfolio presentations; and authentic assessment connecting learning to real-world applications in ${courseSubject}.`
          }
          
          assessmentsList.push({
            id: Date.now() + index,
            goalId: goal.id,
            description: fallbackAssessment,
            isRefined: true
          })
        })
      }

      console.log('Parsed assessments:', assessmentsList)
      setRefinedAssessments(assessmentsList)
      setCurrentStep('assessment-review')
    } catch (error) {
      console.error('Error generating assessments:', error)
      // Create subject-specific fallback assessments if AI fails
      const fallbackAssessments = approvedGoals.map((goal, index) => {
        let fallbackAssessment = ''
        const subjectLower = courseSubject.toLowerCase()
        
        if (subjectLower.includes('3d print') || subjectLower.includes('printing')) {
          fallbackAssessment = `For this 3D printing goal, consider: practical printing assessments with quality rubrics; design challenges with iterative prototyping; troubleshooting documentation; and portfolio showcasing different printing techniques and materials.`
        } else if (subjectLower.includes('program') || subjectLower.includes('coding') || subjectLower.includes('software')) {
          fallbackAssessment = `For this programming goal, options include: code portfolio with documentation; pair programming assessments; debugging challenges; and project presentations demonstrating problem-solving methodology.`
        } else if (subjectLower.includes('design') || subjectLower.includes('creative')) {
          fallbackAssessment = `For this design goal, assessment could involve: design portfolio with process documentation; peer critique sessions; iterative design challenges; and presentation of creative solutions with rationale.`
        } else {
          fallbackAssessment = `For this ${courseSubject} goal, consider multiple assessment approaches: formative assessments through peer discussions and check-ins; summative evaluation via projects or presentations; and authentic tasks connecting to real-world applications.`
        }
        
        return {
          id: Date.now() + index,
          goalId: goal.id,
          description: fallbackAssessment,
          isRefined: true
        }
      })
      setRefinedAssessments(fallbackAssessments)
      setCurrentStep('assessment-review')
    } finally {
      setIsRefining(false)
    }
  }

  const approveAssessments = () => {
    setApprovedAssessments(refinedAssessments)
    setCurrentStep('assessment-saved')
  }

  const approveGoals = () => {
    setApprovedGoals(refinedGoals)
    setCurrentStep('saved')
  }

  const resetApp = () => {
    setCurrentStep('intro')
    setCourseType(null)
    setCourseSubject('')
    setIsSubjectConfirmed(false)
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
              onChange={(e) => setCourseSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && courseSubject.trim() && setIsSubjectConfirmed(true)}
              placeholder="e.g., Introduction to Biology, Web Development Workshop..."
              style={{ flex: 1 }}
            />
          </div>
          <div className="button-group">
            <button
              className="secondary-button"
              onClick={() => setCourseType(null)}
            >
              Back
            </button>
            <button
              className="primary-button"
              onClick={() => setIsSubjectConfirmed(true)}
              disabled={!courseSubject.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        <div className="confirmation-container">
          <p>You selected: <strong>{courseType}</strong></p>
          <p>Subject: <strong>{courseSubject}</strong></p>
          <div className="button-group">
            <button
              className="primary-button"
              onClick={() => setCurrentStep('goals')}
            >
              Continue
            </button>
            <button
              className="secondary-button"
              onClick={() => setIsSubjectConfirmed(false)}
            >
              Change Subject
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
    </div>
  )

  const renderAssessmentReview = () => (
    <div className="step-container">
      <h2>Review Assessment Strategies</h2>
      <p>Here are the AI-generated assessment strategies for each of your learning goals:</p>

      {refinedAssessments.map((assessment, index) => {
        const correspondingGoal = approvedGoals.find(goal => goal.id === assessment.goalId)
        return (
          <div key={assessment.id} className="refined-goals" style={{ marginBottom: '2rem' }}>
            <div className="refined-goal-item">
              <strong>Goal {index + 1}:</strong>
              <p style={{ fontStyle: 'normal', marginBottom: '1rem' }}>{correspondingGoal?.description}</p>
              <strong>Assessment Strategies:</strong>
              <p>{assessment.description}</p>
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
            Yes, Save These Assessments
          </button>
          <button
            className="secondary-button"
            onClick={() => setCurrentStep('assessments')}
          >
            No, Let Me Try Again
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
        return (
          <div key={assessment.id} className="saved-goals" style={{ marginBottom: '1.5rem' }}>
            <h4>Goal {index + 1}: {correspondingGoal?.description}</h4>
            <div className="saved-goal-item">
              <span><strong>Assessment Strategies:</strong> {assessment.description}</span>
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
          onClick={() => {
            // TODO: Add learning objectives step
            alert('Learning objectives feature coming soon!')
          }}
        >
          Continue to Learning Objectives
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

  return (
    <div className="app-container">
      <header>
        <h1>Course Goal Builder</h1>
        <div className="progress-indicator">
          <span className={currentStep === 'intro' ? 'active' : 'completed'}>1. Setup</span>
          <span className={currentStep === 'goals' ? 'active' : currentStep === 'intro' ? '' : 'completed'}>2. Goals</span>
          <span className={currentStep === 'approve' ? 'active' : (currentStep === 'saved' || currentStep === 'assessments' || currentStep === 'assessment-review' || currentStep === 'assessment-saved') ? 'completed' : ''}>3. Review</span>
          <span className={currentStep === 'saved' ? 'active' : (currentStep === 'assessments' || currentStep === 'assessment-review' || currentStep === 'assessment-saved') ? 'completed' : ''}>4. Goals Complete</span>
          <span className={currentStep === 'assessments' ? 'active' : (currentStep === 'assessment-review' || currentStep === 'assessment-saved') ? 'completed' : ''}>5. Assessments</span>
          <span className={currentStep === 'assessment-review' ? 'active' : currentStep === 'assessment-saved' ? 'completed' : ''}>6. Review</span>
          <span className={currentStep === 'assessment-saved' ? 'active' : ''}>7. Complete</span>
        </div>
      </header>

      <main>
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'goals' && renderGoals()}
        {currentStep === 'approve' && renderApprove()}
        {currentStep === 'saved' && renderSaved()}
        {currentStep === 'assessments' && renderAssessments()}
        {currentStep === 'assessment-review' && renderAssessmentReview()}
        {currentStep === 'assessment-saved' && renderAssessmentSaved()}
      </main>
    </div>
  )
}

export default App
