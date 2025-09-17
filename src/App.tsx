import { useState, useEffect, useCallback } from 'react'
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

interface LearningObjective {
  id: number
  goalId: number
  bloomLevel: string
  description: string
  assessmentAlignment: string
}

type Step = 'intro' | 'goals' | 'refine' | 'approve' | 'saved' | 'assessments' | 'assessment-review' | 'assessment-saved' | 'learning-objectives' | 'objectives-review' | 'objectives-saved'

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
  const [inputErrors, setInputErrors] = useState<{[key: string]: string}>({})
  const [showHelp, setShowHelp] = useState(false)

  const addGoal = () => {
    // Clear any previous errors
    setInputErrors({})
    setError('')
    
    const trimmedGoal = currentGoal.trim()
    
    // Validation
    if (!trimmedGoal) {
      setInputErrors({ goal: 'Please enter a goal before adding.' })
      return
    }
    
    if (trimmedGoal.length < 10) {
      setInputErrors({ goal: 'Goals should be at least 10 characters long for meaningful refinement.' })
      return
    }
    
    if (trimmedGoal.length > 300) {
      setInputErrors({ goal: 'Goals should be under 300 characters. Consider breaking into multiple goals.' })
      return
    }
    
    // Check for duplicate goals
    const isDuplicate = goals.some(goal => 
      goal.description.toLowerCase().trim() === trimmedGoal.toLowerCase()
    )
    
    if (isDuplicate) {
      setInputErrors({ goal: 'This goal already exists. Please enter a different goal.' })
      return
    }
    
    // Check maximum goals limit
    if (goals.length >= 5) {
      setInputErrors({ goal: 'Maximum of 5 goals allowed. Please remove a goal before adding a new one.' })
      return
    }

    const newGoal: Goal = {
      id: Date.now(),
      description: trimmedGoal
    }
    console.log('Adding new goal:', newGoal);
    setGoals(prev => {
      const updatedGoals = [...prev, newGoal];
      console.log('Updated goals array:', updatedGoals);
      return updatedGoals;
    });
    setCurrentGoal('');
  }

  const validateAndConfirmSubject = () => {
    setInputErrors({})
    setError('')
    
    const trimmedSubject = courseSubject.trim()
    
    if (!trimmedSubject) {
      setInputErrors({ subject: 'Please enter a course subject.' })
      return
    }
    
    if (trimmedSubject.length < 3) {
      setInputErrors({ subject: 'Course subject should be at least 3 characters long.' })
      return
    }
    
    if (trimmedSubject.length > 100) {
      setInputErrors({ subject: 'Course subject should be under 100 characters.' })
      return
    }
    
    setCourseSubject(trimmedSubject)
    setIsSubjectConfirmed(true)
  }

  const validateAndCompleteSetup = () => {
    setInputErrors({})
    setError('')
    
    const trimmedAudience = targetAudience.trim()
    const trimmedDuration = instructionDuration.trim()
    
    if (!trimmedAudience) {
      setInputErrors({ audience: 'Please describe your target audience.' })
      return
    }
    
    if (trimmedAudience.length < 5) {
      setInputErrors({ audience: 'Target audience description should be at least 5 characters long.' })
      return
    }
    
    if (trimmedAudience.length > 200) {
      setInputErrors({ audience: 'Target audience description should be under 200 characters.' })
      return
    }
    
    if (!trimmedDuration) {
      setInputErrors({ duration: 'Please specify the instruction duration.' })
      return
    }
    
    if (trimmedDuration.length < 3) {
      setInputErrors({ duration: 'Duration should be at least 3 characters long.' })
      return
    }
    
    if (trimmedDuration.length > 100) {
      setInputErrors({ duration: 'Duration should be under 100 characters.' })
      return
    }
    
    setTargetAudience(trimmedAudience)
    setInstructionDuration(trimmedDuration)
    setIsSetupComplete(true)
  }

  const removeGoal = (id: number) => {
    setGoals(prev => prev.filter(goal => goal.id !== id))
  }

  const refineGoalsWithAI = async () => {
    if (goals.length === 0) return

    setIsRefining(true)
    setLoadingMessage('Analyzing your goals...')
    setProgress(20)
    
    try {
      const goalsText = goals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')

      setLoadingMessage('Crafting refined goals with AI assistance...')
      setProgress(50)

      const prompt = `I have these initial goals for a ${courseType} on "${courseSubject}":

INSTRUCTIONAL CONTEXT:
- Course Type: ${courseType}
- Subject: ${courseSubject}
- Target Audience: ${targetAudience}
- Duration: ${instructionDuration}

INITIAL GOALS:
${goalsText}

Please help me refine these goals to make them more specific, measurable, and aligned with effective ${courseType} design principles for the subject of ${courseSubject}.

Important guidelines for refining:
- Be suggestive rather than prescriptive
- Avoid dictating specific vocabulary terms or specific issues that must be addressed
- Use flexible language like "some examples are...", "possibly including...", "such as...", or "which may include..."
- Focus on learning outcomes and measurable behaviors rather than exact content requirements
- Consider the target audience "${targetAudience}" and the duration "${instructionDuration}" when suggesting appropriate complexity and scope
- Allow for instructor flexibility in implementation

For each original goal, provide a refined version that is appropriate for "${targetAudience}" over a "${instructionDuration}" timeframe. Format your response exactly like this:

REFINED GOAL 1: [Your refined version of the first goal]
REFINED GOAL 2: [Your refined version of the second goal]
REFINED GOAL 3: [Your refined version of the third goal]

Make each refined goal clear, actionable, and focused on student outcomes specific to ${courseSubject}, while maintaining flexibility in how the goal can be achieved.`

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })

      setLoadingMessage('Processing AI response...')
      setProgress(80)

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

      setLoadingMessage('Finalizing refined goals...')
      setProgress(100)

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
      setLoadingMessage('Error occurred - using original goals')
      setError('We encountered an issue while refining your goals. Don\'t worry - we\'ve kept your original goals and you can proceed with those or try again.')
      // Fallback to original goals if AI fails
      setRefinedGoals(goals.map(goal => ({ ...goal, isRefined: true })))
      setCurrentStep('approve')
    } finally {
      setIsRefining(false)
      setLoadingMessage('')
      setProgress(0)
    }
  }

  const generateAssessments = async () => {
    if (approvedGoals.length === 0) return

    setIsRefining(true)
    setLoadingMessage('Analyzing your learning goals...')
    setProgress(15)
    
    try {
      const goalsText = approvedGoals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')

      setLoadingMessage('Designing assessment strategies...')
      setProgress(40)

      const prompt = `I have these approved learning goals for a ${courseType} on "${courseSubject}":

INSTRUCTIONAL CONTEXT:
- Course Type: ${courseType}
- Subject: ${courseSubject}
- Target Audience: ${targetAudience}
- Duration: ${instructionDuration}

APPROVED GOALS:
${goalsText}

Please suggest specific, practical assessment strategies for each goal. Focus on authentic, meaningful ways to assess student achievement that are appropriate for "${targetAudience}" within a "${instructionDuration}" timeframe.

Important guidelines:
- Provide 2-3 specific assessment options for each goal
- Use flexible language like "consider...", "options might include...", "could be assessed through..."
- Include both formative (ongoing) and summative (final) assessment methods where appropriate for the duration
- Focus on authentic assessment that connects to real-world application
- Consider the ${courseType} format, target audience "${targetAudience}", and time constraints of "${instructionDuration}"
- Suggest assessments that provide actionable feedback to students
- Ensure assessments are realistic and feasible for the given timeframe and audience

For each goal, provide detailed assessment suggestions appropriate for "${targetAudience}" over "${instructionDuration}". Format your response EXACTLY like this:

ASSESSMENT FOR GOAL 1: [Provide 2-3 specific assessment methods for goal 1, separated by semicolons or bullet points]

ASSESSMENT FOR GOAL 2: [Provide 2-3 specific assessment methods for goal 2, separated by semicolons or bullet points]

ASSESSMENT FOR GOAL 3: [Provide 2-3 specific assessment methods for goal 3, separated by semicolons or bullet points]

Make each assessment suggestion concrete, practical, and directly aligned with measuring the specific goal for ${courseSubject}.`

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })

      setLoadingMessage('Processing assessment recommendations...')
      setProgress(70)

      console.log('API Response received:', response)
      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''
      console.log('AI Assessment Response:', aiResponse)
      console.log('AI Response length:', aiResponse.length)

      // Parse AI response and create assessment suggestions
      const assessmentsList: Assessment[] = []
      const lines = aiResponse.split('\n').filter(line => line.trim())
      console.log('Filtered lines:', lines)

      let currentGoalIndex = -1
      let currentAssessmentText = ''

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for assessment headers (more flexible matching)
        const assessmentMatch = line.match(/^ASSESSMENT\s+FOR\s+GOAL\s+(\d+):\s*(.*)$/i)
        
        if (assessmentMatch) {
          console.log('Found assessment match:', assessmentMatch)
          // Save previous assessment if we have one
          if (currentGoalIndex >= 0 && currentAssessmentText.trim()) {
            console.log('Saving previous assessment:', currentAssessmentText.trim())
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
          console.log('Started new assessment for goal index:', currentGoalIndex)
        } else if (currentGoalIndex >= 0 && line) {
          // Continue building the current assessment text
          currentAssessmentText += (currentAssessmentText ? ' ' : '') + line
          console.log('Building assessment text:', currentAssessmentText)
        }
      }

      // Don't forget the last assessment
      if (currentGoalIndex >= 0 && currentAssessmentText.trim() && currentGoalIndex < approvedGoals.length) {
        console.log('Saving final assessment:', currentAssessmentText.trim())
        assessmentsList.push({
          id: Date.now() + currentGoalIndex,
          goalId: approvedGoals[currentGoalIndex].id,
          description: currentAssessmentText.trim(),
          isRefined: true
        })
      }

      console.log('Final assessments list:', assessmentsList)

      // If no assessments were parsed, try alternative parsing methods
      if (assessmentsList.length === 0 && aiResponse.length > 50) {
        console.log('Trying alternative parsing methods...')
        
        // Try parsing by goal numbers (1., 2., 3., etc.)
        const goalMatches = aiResponse.match(/(\d+\.\s*[^1-9]+?)(?=\d+\.|$)/gs)
        if (goalMatches && goalMatches.length > 0) {
          console.log('Found goal-based matches:', goalMatches)
          goalMatches.forEach((match, index) => {
            if (index < approvedGoals.length) {
              const cleanText = match.replace(/^\d+\.\s*/, '').trim()
              if (cleanText.length > 10) {
                assessmentsList.push({
                  id: Date.now() + index,
                  goalId: approvedGoals[index].id,
                  description: cleanText,
                  isRefined: true
                })
              }
            }
          })
        }
        
        // If still no luck, try splitting by double newlines or paragraphs
        if (assessmentsList.length === 0) {
          const paragraphs = aiResponse.split(/\n\s*\n/).filter(p => p.trim().length > 20)
          console.log('Found paragraphs:', paragraphs)
          paragraphs.forEach((paragraph, index) => {
            if (index < approvedGoals.length) {
              assessmentsList.push({
                id: Date.now() + index,
                goalId: approvedGoals[index].id,
                description: paragraph.trim(),
                isRefined: true
              })
            }
          })
        }
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
      
      setLoadingMessage('Finalizing assessment strategies...')
      setProgress(100)
      
      setRefinedAssessments(assessmentsList)
      setCurrentStep('assessment-review')
    } catch (error) {
      console.error('Error generating assessments:', error)
      setLoadingMessage('Error occurred - creating fallback assessments...')
      setProgress(90)
      
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
      setLoadingMessage('')
      setProgress(0)
    }
  }

  const approveAssessments = () => {
    setApprovedAssessments(refinedAssessments)
    setCurrentStep('assessment-saved')
  }

  const generateLearningObjectives = useCallback(async () => {
    if (approvedGoals.length === 0 || approvedAssessments.length === 0) return

    setIsRefining(true)
    setLoadingMessage('Analyzing goals and assessments...')
    setProgress(20)
    
    try {
      const goalsText = approvedGoals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')
      const assessmentsText = approvedAssessments.map((assessment) => {
        const goalIndex = approvedGoals.findIndex(goal => goal.id === assessment.goalId)
        return `Goal ${goalIndex + 1} Assessment: ${assessment.description}`
      }).join('\n\n')

      setLoadingMessage('Creating learning objectives with Bloom\'s Taxonomy...')
      setProgress(50)

      const prompt = `I am creating learning objectives for a ${courseType} on "${courseSubject}" using Bloom's Taxonomy and backward design principles.

INSTRUCTIONAL CONTEXT:
- Course Type: ${courseType}
- Subject: ${courseSubject}
- Target Audience: ${targetAudience}
- Duration: ${instructionDuration}

APPROVED GOALS:
${goalsText}

APPROVED ASSESSMENTS:
${assessmentsText}

Please create 2-3 specific, measurable learning objectives for each goal. Each objective must:

1. BLOOM'S TAXONOMY: Use action verbs from Bloom's Taxonomy appropriate for the target audience and course duration
2. BACKWARD DESIGN: Align directly with the goal AND be measurable by the corresponding assessment
3. AUDIENCE-APPROPRIATE: Consider the cognitive level and prior knowledge of "${targetAudience}"
4. TIME-APPROPRIATE: Realistic for "${instructionDuration}" of instruction
5. SPECIFICITY: Be concrete and observable (avoid vague terms like "appreciate" or "understand")
6. ALIGNMENT: Ensure the objective can be assessed by the listed assessment method

Bloom's Taxonomy Action Verbs by Level:
- Remember: define, describe, identify, list, name, recall, recognize, retrieve
- Understand: classify, compare, explain, interpret, paraphrase, predict, summarize
- Apply: demonstrate, execute, implement, solve, use, apply, operate
- Analyze: analyze, break down, categorize, compare, contrast, differentiate, examine
- Evaluate: appraise, critique, defend, evaluate, judge, justify, support
- Create: assemble, construct, create, design, develop, formulate, generate

IMPORTANT: Consider the target audience "${targetAudience}" when selecting appropriate Bloom's levels. For example:
- Introductory courses: Focus more on Remember, Understand, Apply levels
- Advanced courses: Include more Analyze, Evaluate, Create levels
- Short workshops: Emphasize Apply and basic Analyze levels
- Longer courses: Can progress through multiple Bloom's levels

Format your response EXACTLY like this:

OBJECTIVES FOR GOAL 1:
• [Bloom Level]: [Specific measurable objective using appropriate action verb]
• [Bloom Level]: [Specific measurable objective using appropriate action verb]
• [Bloom Level]: [Specific measurable objective using appropriate action verb]

OBJECTIVES FOR GOAL 2:
• [Bloom Level]: [Specific measurable objective using appropriate action verb]
• [Bloom Level]: [Specific measurable objective using appropriate action verb]

Continue for each goal. Ensure objectives progress logically through Bloom's levels when appropriate for the ${courseSubject} content.`

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })

      setLoadingMessage('Processing learning objectives...')
      setProgress(80)

      console.log('Objectives API Response received:', response)
      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''
      console.log('AI Objectives Response:', aiResponse)

      // Parse AI response and create learning objectives
      const objectivesList: LearningObjective[] = []
      const lines = aiResponse.split('\n').filter(line => line.trim())
      
      let currentGoalIndex = -1
      let objectiveId = Date.now()

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for objective headers (more flexible matching)
        const objectiveMatch = line.match(/^OBJECTIVES\s+FOR\s+GOAL\s+(\d+):\s*$/i)
        
        if (objectiveMatch) {
          currentGoalIndex = parseInt(objectiveMatch[1]) - 1
          console.log('Found objectives for goal index:', currentGoalIndex)
        } else if (currentGoalIndex >= 0 && currentGoalIndex < approvedGoals.length) {
          // Look for lines that start with bullet points or contain Bloom level indicators
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
            // Parse individual objective with Bloom level
            const objectiveText = line.replace(/^[•\-*]\s*/, '').trim()
            const bloomMatch = objectiveText.match(/^([^:]+):\s*(.*)$/)
            
            if (bloomMatch) {
              const bloomLevel = bloomMatch[1].trim()
              const description = bloomMatch[2].trim()
              const relatedAssessment = approvedAssessments.find(a => a.goalId === approvedGoals[currentGoalIndex].id)
              
              objectivesList.push({
                id: objectiveId++,
                goalId: approvedGoals[currentGoalIndex].id,
                bloomLevel: bloomLevel,
                description: description,
                assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
              })
              console.log('Added objective:', bloomLevel, description)
            } else {
              // If no colon found, try to extract Bloom level from common patterns
              const bloomWords = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create', 'recall', 'identify', 'explain', 'demonstrate', 'compare', 'critique', 'design']
              const firstWord = objectiveText.split(' ')[0].toLowerCase()
              if (bloomWords.includes(firstWord)) {
                const relatedAssessment = approvedAssessments.find(a => a.goalId === approvedGoals[currentGoalIndex].id)
                objectivesList.push({
                  id: objectiveId++,
                  goalId: approvedGoals[currentGoalIndex].id,
                  bloomLevel: firstWord.charAt(0).toUpperCase() + firstWord.slice(1),
                  description: objectiveText,
                  assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
                })
                console.log('Added objective with detected Bloom level:', firstWord, objectiveText)
              }
            }
          }
        }
      }

      console.log('Final parsed learning objectives:', objectivesList)

      // If no objectives were parsed, try alternative parsing or create better fallbacks
      if (objectivesList.length === 0) {
        console.log('No objectives parsed, creating enhanced fallback objectives')
        const fallbackObjectives = approvedGoals.flatMap((goal, goalIndex) => {
          const relatedAssessment = approvedAssessments.find(a => a.goalId === goal.id)
          const bloomLevels = ['Apply', 'Analyze', 'Evaluate']
          const verbs = ['Demonstrate', 'Analyze', 'Evaluate']
          
          return bloomLevels.map((level, levelIndex) => ({
            id: objectiveId + goalIndex * 3 + levelIndex,
            goalId: goal.id,
            bloomLevel: level,
            description: `${verbs[levelIndex]} key concepts and skills related to: ${goal.description.substring(0, 80)}${goal.description.length > 80 ? '...' : ''}`,
            assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
          }))
        })
        objectivesList.push(...fallbackObjectives)
      }

      setLoadingMessage('Finalizing learning objectives...')
      setProgress(100)

      setRefinedObjectives(objectivesList)
      setCurrentStep('objectives-review')
    } catch (error) {
      console.error('Error generating learning objectives:', error)
      setLoadingMessage('Error occurred - creating fallback objectives...')
      setProgress(90)
      
      // Create enhanced fallback objectives if AI fails
      const fallbackObjectives = approvedGoals.flatMap((goal, goalIndex) => {
        const relatedAssessment = approvedAssessments.find(a => a.goalId === goal.id)
        
        // Create more specific objectives based on goal content
        const goalText = goal.description.toLowerCase()
        let objectives = []
        
        if (goalText.includes('3d print') || goalText.includes('printing')) {
          objectives = [
            {
              id: Date.now() + goalIndex * 3,
              goalId: goal.id,
              bloomLevel: 'Apply',
              description: `Demonstrate proper 3D printing techniques and troubleshoot common printing issues`,
              assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
            },
            {
              id: Date.now() + goalIndex * 3 + 1,
              goalId: goal.id,
              bloomLevel: 'Analyze',
              description: `Analyze print quality issues and determine appropriate solutions for different printing scenarios`,
              assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
            }
          ]
        } else if (goalText.includes('troubleshoot') || goalText.includes('problem')) {
          objectives = [
            {
              id: Date.now() + goalIndex * 3,
              goalId: goal.id,
              bloomLevel: 'Analyze',
              description: `Analyze and identify root causes of technical problems systematically`,
              assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
            },
            {
              id: Date.now() + goalIndex * 3 + 1,
              goalId: goal.id,
              bloomLevel: 'Apply',
              description: `Apply troubleshooting methodologies to resolve technical issues effectively`,
              assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
            }
          ]
        } else {
          // Generic but meaningful objectives
          objectives = [
            {
              id: Date.now() + goalIndex * 3,
              goalId: goal.id,
              bloomLevel: 'Apply',
              description: `Apply core concepts and demonstrate practical skills related to the learning goal`,
              assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
            },
            {
              id: Date.now() + goalIndex * 3 + 1,
              goalId: goal.id,
              bloomLevel: 'Analyze',
              description: `Analyze situations and evaluate appropriate approaches for achieving the learning goal`,
              assessmentAlignment: relatedAssessment ? relatedAssessment.description.substring(0, 100) + '...' : 'Assessment alignment needed'
            }
          ]
        }
        
        return objectives
      })
      setRefinedObjectives(fallbackObjectives)
      setCurrentStep('objectives-review')
    } finally {
      setIsRefining(false)
      setLoadingMessage('')
      setProgress(0)
    }
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
    
    return helpContent[step] || null
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
            {helpContent.content.map((tip, index) => (
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
              onKeyDown={(e) => e.key === 'Enter' && courseSubject.trim() && validateAndConfirmSubject()}
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
              onClick={validateAndConfirmSubject}
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
              onClick={validateAndCompleteSetup}
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
