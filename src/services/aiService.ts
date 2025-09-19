// AI Service - Now uses secure Netlify Functions instead of direct API calls
import type { Goal, Assessment, LearningObjective, Step } from '../types'
import { createAppError, handleAsyncError, ErrorCategory, ErrorSeverity, type AppError } from '../utils/errorHandling'

// Helper function to call our secure Netlify function with enhanced error handling
async function callAIFunction(prompt: string, type: string): Promise<string> {
  const result = await handleAsyncError(async () => {
    const response = await fetch('/.netlify/functions/ai-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, type })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }))
      
      // Create more specific error based on status code
      let appError: AppError
      if (response.status === 401) {
        appError = createAppError(
          'Authentication failed',
          { status: response.status, type },
          {
            category: ErrorCategory.PERMISSION,
            severity: ErrorSeverity.HIGH,
            userMessage: 'API authentication failed. Please check that your API key is correctly configured.',
            retryable: false
          }
        )
      } else if (response.status === 403) {
        appError = createAppError(
          'Access forbidden',
          { status: response.status, type },
          {
            category: ErrorCategory.PERMISSION,
            severity: ErrorSeverity.HIGH,
            userMessage: 'API access denied. Please check your API key permissions and billing status.',
            retryable: false
          }
        )
      } else if (response.status >= 500) {
        appError = createAppError(
          'Server error',
          { status: response.status, type },
          {
            category: ErrorCategory.API,
            severity: ErrorSeverity.HIGH,
            userMessage: 'Our AI service is experiencing issues. Please try again in a few minutes.',
            retryable: true
          }
        )
      } else if (response.status === 429) {
        appError = createAppError(
          'Rate limit exceeded',
          { status: response.status, type },
          {
            category: ErrorCategory.API,
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'Too many requests. Please wait a moment before trying again.',
            retryable: true
          }
        )
      } else {
        appError = createAppError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          { status: response.status, type },
          {
            category: ErrorCategory.API,
            severity: ErrorSeverity.MEDIUM,
            userMessage: 'We couldn\'t process your AI request right now. Please try again.',
            retryable: true
          }
        )
      }
      
      throw appError
    }

    const data = await response.json()
    if (!data.response) {
      throw createAppError(
        'Invalid AI response format',
        { type, responseData: data },
        {
          category: ErrorCategory.DATA,
          severity: ErrorSeverity.MEDIUM,
          userMessage: 'Received an invalid response from the AI service. Please try again.',
          retryable: true
        }
      )
    }
    
    return data.response
  }, { operation: 'AI API call', type })

  if (!result.success) {
    throw result.error
  }
  
  return result.data
}

// Enhanced retry logic for AI operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: AppError | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? createAppError(error) : error as AppError
      
      // Don't retry if error is not retryable or we've exhausted attempts
      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }
  
  throw lastError!
}

export interface AIServiceCallbacks {
  setIsRefining: (refining: boolean) => void
  setLoadingMessage: (message: string) => void
  setProgress: (progress: number) => void
  setError: (error: string) => void
  setCurrentStep: (step: Step) => void
}

export interface CourseContext {
  courseType: 'course' | 'workshop'
  courseSubject: string
  targetAudience: string
  instructionDuration: string
}

/**
 * Refines initial goals using AI to make them more specific and measurable
 */
export const refineGoalsWithAI = async (
  goals: Goal[],
  context: CourseContext,
  callbacks: AIServiceCallbacks & {
    setRefinedGoals: (goals: Goal[]) => void
  }
): Promise<void> => {
  if (goals.length === 0) return

  callbacks.setIsRefining(true)
  callbacks.setLoadingMessage('Analyzing your goals...')
  callbacks.setProgress(20)
  
  try {
    const goalsText = goals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')

    callbacks.setLoadingMessage('Crafting refined goals with AI assistance...')
    callbacks.setProgress(50)

    const prompt = `I have these initial goals for a ${context.courseType} on "${context.courseSubject}":

INSTRUCTIONAL CONTEXT:
- Course Type: ${context.courseType}
- Subject: ${context.courseSubject}
- Target Audience: ${context.targetAudience}
- Duration: ${context.instructionDuration}

INITIAL GOALS:
${goalsText}

Please help me refine these goals to make them more specific, measurable, and aligned with effective ${context.courseType} design principles for the subject of ${context.courseSubject}.

Important guidelines for refining:
- Be suggestive rather than prescriptive
- Avoid dictating specific vocabulary terms or specific issues that must be addressed
- Use flexible language like "some examples are...", "possibly including...", "such as...", or "which may include..."
- Focus on learning outcomes and measurable behaviors rather than exact content requirements
- Consider the target audience "${context.targetAudience}" and the duration "${context.instructionDuration}" when suggesting appropriate complexity and scope
- Allow for instructor flexibility in implementation

For each original goal, provide a refined version that is appropriate for "${context.targetAudience}" over a "${context.instructionDuration}" timeframe. Format your response exactly like this:

REFINED GOAL 1: [Your refined version of the first goal]
REFINED GOAL 2: [Your refined version of the second goal]
REFINED GOAL 3: [Your refined version of the third goal]

Make each refined goal clear, actionable, and focused on student outcomes specific to ${context.courseSubject}, while maintaining flexibility in how the goal can be achieved.`

    // Use retry logic for AI calls
    const aiResponse = await retryOperation(() => callAIFunction(prompt, 'refine-goals'))

    callbacks.setLoadingMessage('Processing AI response...')
    callbacks.setProgress(80)

    // Parse AI response and create refined goals
    const refinedGoalsList: Goal[] = []
    const lines = aiResponse.split('\n').filter((line: string) => line.trim())

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

    callbacks.setLoadingMessage('Finalizing refined goals...')
    callbacks.setProgress(100)

    // If no goals were parsed, fall back to original goals
    if (refinedGoalsList.length === 0) {
      console.log('No refined goals parsed, using original goals')
      callbacks.setRefinedGoals(goals.map(goal => ({ ...goal, isRefined: true })))
    } else {
      console.log('Parsed refined goals:', refinedGoalsList)
      callbacks.setRefinedGoals(refinedGoalsList)
    }

    callbacks.setCurrentStep('approve')
  } catch (error) {
    console.error('Error refining goals:', error)
    
    // Handle AppError objects with better user messaging
    if (error && typeof error === 'object' && 'userMessage' in error) {
      const appError = error as AppError
      callbacks.setError(appError.userMessage)
      
      // Log structured error information
      console.error('AI Service Error Details:', {
        id: appError.id,
        category: appError.category,
        severity: appError.severity,
        retryable: appError.retryable,
        context: appError.context
      })
    } else {
      // Fallback for unexpected error types
      const errorMessage = error instanceof Error ? error.message : String(error)
      let userMessage = 'We encountered an issue while refining your goals. Don\'t worry - we\'ve kept your original goals and you can proceed with those or try again.'
      
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
        userMessage = 'API authentication failed. Please check that your API key is correctly configured in the environment variables.'
      } else if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        userMessage = 'API access denied. Please check your API key permissions and billing status.'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Network connection issue. Please check your internet connection and try again.'
      }
      
      callbacks.setError(userMessage)
    }
    
    callbacks.setLoadingMessage('Error occurred - using original goals')
    // Fallback to original goals if AI fails
    callbacks.setRefinedGoals(goals.map(goal => ({ ...goal, isRefined: true })))
    callbacks.setCurrentStep('approve')
  } finally {
    callbacks.setIsRefining(false)
    callbacks.setLoadingMessage('')
    callbacks.setProgress(0)
  }
}

/**
 * Creates subject-specific fallback assessment based on course subject
 */
const createSubjectSpecificFallback = (courseSubject: string, goalIndex: number): Assessment => {
  const subjectLower = courseSubject.toLowerCase()
  let fallbackAssessment = ''
  
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
  
  return {
    id: Date.now() + goalIndex,
    goalId: -1, // Will be set by caller
    description: fallbackAssessment,
    isRefined: true
  }
}

/**
 * Generates assessment strategies for approved goals using AI
 */
export const generateAssessments = async (
  approvedGoals: Goal[],
  context: CourseContext,
  callbacks: AIServiceCallbacks & {
    setRefinedAssessments: (assessments: Assessment[]) => void
  }
): Promise<void> => {
  if (approvedGoals.length === 0) return

  callbacks.setIsRefining(true)
  callbacks.setLoadingMessage('Analyzing your learning goals...')
  callbacks.setProgress(15)
  
  try {
    const goalsText = approvedGoals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')

    callbacks.setLoadingMessage('Designing assessment strategies...')
    callbacks.setProgress(40)

    const prompt = `I have these approved learning goals for a ${context.courseType} on "${context.courseSubject}":

INSTRUCTIONAL CONTEXT:
- Course Type: ${context.courseType}
- Subject: ${context.courseSubject}
- Target Audience: ${context.targetAudience}
- Duration: ${context.instructionDuration}

APPROVED GOALS:
${goalsText}

Please suggest specific, practical assessment strategies for each goal. Focus on authentic, meaningful ways to assess student achievement that are appropriate for "${context.targetAudience}" within a "${context.instructionDuration}" timeframe.

Important guidelines:
- Provide 2-3 specific assessment options for each goal
- Use flexible language like "consider...", "options might include...", "could be assessed through..."
- Include both formative (ongoing) and summative (final) assessment methods where appropriate for the duration
- Focus on authentic assessment that connects to real-world application
- Consider the ${context.courseType} format, target audience "${context.targetAudience}", and time constraints of "${context.instructionDuration}"
- Suggest assessments that provide actionable feedback to students
- Ensure assessments are realistic and feasible for the given timeframe and audience

For each goal, provide detailed assessment suggestions appropriate for "${context.targetAudience}" over "${context.instructionDuration}". Format your response EXACTLY like this:

ASSESSMENT FOR GOAL 1: [Provide 2-3 specific assessment methods for goal 1, separated by semicolons or bullet points]

ASSESSMENT FOR GOAL 2: [Provide 2-3 specific assessment methods for goal 2, separated by semicolons or bullet points]

ASSESSMENT FOR GOAL 3: [Provide 2-3 specific assessment methods for goal 3, separated by semicolons or bullet points]

Make each assessment suggestion concrete, practical, and directly aligned with measuring the specific goal for ${context.courseSubject}.`

    const aiResponse = await callAIFunction(prompt, 'generate-assessments')

    callbacks.setLoadingMessage('Processing assessment recommendations...')
    callbacks.setProgress(70)

    console.log('AI Response received:', aiResponse)
    console.log('AI Assessment Response:', aiResponse)
    console.log('AI Response length:', aiResponse.length)

    // Parse AI response and create assessment suggestions
    const assessmentsList: Assessment[] = []
    const lines = aiResponse.split('\n').filter((line: string) => line.trim())
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
        goalMatches.forEach((match: string, index: number) => {
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
        const fallback = createSubjectSpecificFallback(context.courseSubject, index)
        fallback.goalId = goal.id
        assessmentsList.push(fallback)
      })
    }

    console.log('Parsed assessments:', assessmentsList)
    
    callbacks.setLoadingMessage('Finalizing assessment strategies...')
    callbacks.setProgress(100)
    
    callbacks.setRefinedAssessments(assessmentsList)
    callbacks.setCurrentStep('assessment-review')
  } catch (error) {
    console.error('Error generating assessments:', error)
    callbacks.setLoadingMessage('Error occurred - creating fallback assessments...')
    callbacks.setProgress(90)
    
    // Create subject-specific fallback assessments if AI fails
    const fallbackAssessments = approvedGoals.map((goal, index) => {
      const fallback = createSubjectSpecificFallback(context.courseSubject, index)
      
      // Create more specific fallback based on the goal text
      if (context.courseSubject.toLowerCase().includes('3d print') || context.courseSubject.toLowerCase().includes('printing')) {
        fallback.description = `For this 3D printing goal, consider: practical printing assessments with quality rubrics; design challenges with iterative prototyping; troubleshooting documentation; and portfolio showcasing different printing techniques and materials.`
      } else if (context.courseSubject.toLowerCase().includes('program') || context.courseSubject.toLowerCase().includes('coding') || context.courseSubject.toLowerCase().includes('software')) {
        fallback.description = `For this programming goal, options include: code portfolio with documentation; pair programming assessments; debugging challenges; and project presentations demonstrating problem-solving methodology.`
      } else if (context.courseSubject.toLowerCase().includes('design') || context.courseSubject.toLowerCase().includes('creative')) {
        fallback.description = `For this design goal, assessment could involve: design portfolio with process documentation; peer critique sessions; iterative design challenges; and presentation of creative solutions with rationale.`
      } else {
        fallback.description = `For this ${context.courseSubject} goal, consider multiple assessment approaches: formative assessments through peer discussions and check-ins; summative evaluation via projects or presentations; and authentic tasks connecting to real-world applications.`
      }
      
      fallback.goalId = goal.id
      return fallback
    })
    callbacks.setRefinedAssessments(fallbackAssessments)
    callbacks.setCurrentStep('assessment-review')
  } finally {
    callbacks.setIsRefining(false)
    callbacks.setLoadingMessage('')
    callbacks.setProgress(0)
  }
}

/**
 * Creates enhanced fallback learning objectives based on goal content
 */
const createEnhancedFallbackObjectives = (
  goal: Goal, 
  goalIndex: number, 
  relatedAssessment: Assessment | undefined
): LearningObjective[] => {
  const goalText = goal.description.toLowerCase()
  let objectives: LearningObjective[] = []
  
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
}

/**
 * Generates learning objectives using Bloom's Taxonomy and backward design principles
 */
export const generateLearningObjectives = async (
  approvedGoals: Goal[],
  approvedAssessments: Assessment[],
  context: CourseContext,
  callbacks: AIServiceCallbacks & {
    setRefinedObjectives: (objectives: LearningObjective[]) => void
  }
): Promise<void> => {
  if (approvedGoals.length === 0 || approvedAssessments.length === 0) return

  callbacks.setIsRefining(true)
  callbacks.setLoadingMessage('Analyzing goals and assessments...')
  callbacks.setProgress(20)
  
  try {
    const goalsText = approvedGoals.map((goal, index) => `${index + 1}. ${goal.description}`).join('\n')
    const assessmentsText = approvedAssessments.map((assessment) => {
      const goalIndex = approvedGoals.findIndex(goal => goal.id === assessment.goalId)
      return `Goal ${goalIndex + 1} Assessment: ${assessment.description}`
    }).join('\n\n')

    callbacks.setLoadingMessage('Creating learning objectives with Bloom\'s Taxonomy...')
    callbacks.setProgress(50)

    const prompt = `I am creating learning objectives for a ${context.courseType} on "${context.courseSubject}" using Bloom's Taxonomy and backward design principles.

INSTRUCTIONAL CONTEXT:
- Course Type: ${context.courseType}
- Subject: ${context.courseSubject}
- Target Audience: ${context.targetAudience}
- Duration: ${context.instructionDuration}

APPROVED GOALS:
${goalsText}

APPROVED ASSESSMENTS:
${assessmentsText}

Please create 2-3 specific, measurable learning objectives for each goal. Each objective must:

1. BLOOM'S TAXONOMY: Use action verbs from Bloom's Taxonomy appropriate for the target audience and course duration
2. BACKWARD DESIGN: Align directly with the goal AND be measurable by the corresponding assessment
3. AUDIENCE-APPROPRIATE: Consider the cognitive level and prior knowledge of "${context.targetAudience}"
4. TIME-APPROPRIATE: Realistic for "${context.instructionDuration}" of instruction
5. SPECIFICITY: Be concrete and observable (avoid vague terms like "appreciate" or "understand")
6. ALIGNMENT: Ensure the objective can be assessed by the listed assessment method

Bloom's Taxonomy Action Verbs by Level:
- Remember: define, describe, identify, list, name, recall, recognize, retrieve
- Understand: classify, compare, explain, interpret, paraphrase, predict, summarize
- Apply: demonstrate, execute, implement, solve, use, apply, operate
- Analyze: analyze, break down, categorize, compare, contrast, differentiate, examine
- Evaluate: appraise, critique, defend, evaluate, judge, justify, support
- Create: assemble, construct, create, design, develop, formulate, generate

IMPORTANT: Consider the target audience "${context.targetAudience}" when selecting appropriate Bloom's levels. For example:
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

Continue for each goal. Ensure objectives progress logically through Bloom's levels when appropriate for the ${context.courseSubject} content.`

    const aiResponse = await callAIFunction(prompt, 'generate-objectives')

    callbacks.setLoadingMessage('Processing learning objectives...')
    callbacks.setProgress(80)

    console.log('Objectives AI Response received:', aiResponse)
    console.log('AI Objectives Response:', aiResponse)

    // Parse AI response and create learning objectives
    const objectivesList: LearningObjective[] = []
    const lines = aiResponse.split('\n').filter((line: string) => line.trim())
    
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

    callbacks.setLoadingMessage('Finalizing learning objectives...')
    callbacks.setProgress(100)

    callbacks.setRefinedObjectives(objectivesList)
    callbacks.setCurrentStep('objectives-review')
  } catch (error) {
    console.error('Error generating learning objectives:', error)
    callbacks.setLoadingMessage('Error occurred - creating fallback objectives...')
    callbacks.setProgress(90)
    
    // Create enhanced fallback objectives if AI fails
    const fallbackObjectives = approvedGoals.flatMap((goal, goalIndex) => {
      const relatedAssessment = approvedAssessments.find(a => a.goalId === goal.id)
      return createEnhancedFallbackObjectives(goal, goalIndex, relatedAssessment)
    })
    callbacks.setRefinedObjectives(fallbackObjectives)
    callbacks.setCurrentStep('objectives-review')
  } finally {
    callbacks.setIsRefining(false)
    callbacks.setLoadingMessage('')
    callbacks.setProgress(0)
  }
}