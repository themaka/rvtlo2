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
- Start each refined goal with action-focused language like "Students will be able to..." or "Learners will demonstrate..."
- Do NOT start goals with the course subject name "${context.courseSubject}"
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

    // Enhanced logging for debugging
    console.log('AI Response for goal refinement:', aiResponse)
    console.log('Original goals:', goals.map(g => g.description))
    console.log('Course subject:', context.courseSubject)

    // Parse AI response and create refined goals
    const refinedGoalsList: Goal[] = []
    const lines = aiResponse.split('\n').filter((line: string) => line.trim())

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      console.log(`Processing line ${i}: "${line}"`)
      
      // Look for lines that start with "REFINED GOAL X:"
      const refinedGoalMatch = line.match(/^REFINED GOAL \d+:\s*(.+)$/i)
      if (refinedGoalMatch) {
        let goalText = refinedGoalMatch[1].trim()
        console.log(`Matched refined goal: "${goalText}"`)
        
        // Check and filter out goals that inappropriately start with the subject
        const subjectWords = context.courseSubject.toLowerCase().split(/\s+/)
        const goalTextLower = goalText.toLowerCase()
        
        // Check if goal starts with the subject or major subject words
        let startsWithSubject = false
        if (subjectWords.length > 0) {
          // Check if goal starts with the full subject
          if (goalTextLower.startsWith(context.courseSubject.toLowerCase())) {
            startsWithSubject = true
          }
          // Check if goal starts with the first significant word of the subject (length > 3)
          else if (subjectWords[0].length > 3 && goalTextLower.startsWith(subjectWords[0])) {
            startsWithSubject = true
          }
        }
        
        if (startsWithSubject) {
          console.warn(`Warning: Fixing goal that starts with subject "${context.courseSubject}": ${goalText}`)
          // Try to fix it by removing the subject prefix and adding proper learning outcome language
          let fixedGoalText = goalText
          
          // Remove the subject from the beginning
          if (goalTextLower.startsWith(context.courseSubject.toLowerCase())) {
            fixedGoalText = goalText.substring(context.courseSubject.length).trim()
          } else if (subjectWords[0].length > 3 && goalTextLower.startsWith(subjectWords[0])) {
            fixedGoalText = goalText.substring(subjectWords[0].length).trim()
          }
          
          // Clean up any remaining punctuation or conjunctions at the start
          fixedGoalText = fixedGoalText.replace(/^[:\-,\s]+/, '').trim()
          
          // Add proper learning outcome language if it doesn't exist
          if (!fixedGoalText.toLowerCase().startsWith('students will') && 
              !fixedGoalText.toLowerCase().startsWith('learners will') && 
              !fixedGoalText.toLowerCase().startsWith('participants will')) {
            fixedGoalText = `Students will be able to ${fixedGoalText}`
          }
          
          console.log(`Fixed goal text: ${fixedGoalText}`)
          goalText = fixedGoalText
        }
        
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

    // If no goals were parsed, fall back to original goals (ensuring they don't start with subject)
    if (refinedGoalsList.length === 0) {
      console.log('No refined goals parsed, using original goals with subject check')
      const safeOriginalGoals = goals.map(goal => {
        let description = goal.description
        const subjectWords = context.courseSubject.toLowerCase().split(/\s+/)
        const descriptionLower = description.toLowerCase()
        
        // Check if original goal starts with subject
        if (subjectWords.length > 0 && 
            (descriptionLower.startsWith(context.courseSubject.toLowerCase()) ||
             (subjectWords[0].length > 3 && descriptionLower.startsWith(subjectWords[0])))) {
          console.warn(`Warning: Original goal starts with subject, fixing: ${description}`)
          
          // Remove subject prefix
          if (descriptionLower.startsWith(context.courseSubject.toLowerCase())) {
            description = description.substring(context.courseSubject.length).trim()
          } else if (subjectWords[0].length > 3 && descriptionLower.startsWith(subjectWords[0])) {
            description = description.substring(subjectWords[0].length).trim()
          }
          
          // Clean up and add proper language
          description = description.replace(/^[:\-,\s]+/, '').trim()
          if (!description.toLowerCase().startsWith('students will') && 
              !description.toLowerCase().startsWith('learners will') && 
              !description.toLowerCase().startsWith('participants will')) {
            description = `Students will be able to ${description}`
          }
          
          console.log(`Fixed original goal: ${description}`)
        }
        
        return { ...goal, description, isRefined: true }
      })
      callbacks.setRefinedGoals(safeOriginalGoals)
    } else {
      console.log('Parsed refined goals:', refinedGoalsList)
      callbacks.setRefinedGoals(refinedGoalsList)
    }

    callbacks.setCurrentStep('review-goals')
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
    callbacks.setCurrentStep('review-goals')
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

For each goal, provide detailed assessment suggestions appropriate for "${context.targetAudience}" over "${context.instructionDuration}".

IMPORTANT: Return your response as JSON only (no explanatory text). The JSON must follow this exact schema:

{
  "assessments": [
    {
      "goal": 1,
      "strategies": [
        { "title": "Troubleshooting Lab Practical", "description": "Consider a hands-on lab..." },
        { "title": null, "description": "Maintain a print-quality portfolio..." }
      ]
    },
    { "goal": 2, "strategies": [ ... ] }
  ]
}

Guidelines for the JSON response:
- Include one object per goal. Use the numeric goal index matching the order in the APPROVED GOALS list (1-based).
- For each strategy, include a title when appropriate (or null) and a short description. Provide 2-3 strategies per goal.
- Ensure all strings are plain text suitable for JSON (escape quotes where necessary).
- Do NOT include any extra commentary, headings, or non-JSON text. If you cannot follow the JSON format, return valid JSON with an empty "assessments" array.

If the model cannot produce JSON, we will fall back to parsing free-form text, but JSON is strongly preferred because it will be deterministic and easy to parse.`

    const aiResponse = await callAIFunction(prompt, 'generate-assessments')

    callbacks.setLoadingMessage('Processing assessment recommendations...')
    callbacks.setProgress(70)

    // console.log('AI Response received:', aiResponse)
    // console.log('=== ASSESSMENT PARSING DEBUG ===')
    // console.log('AI Response length:', aiResponse.length)
    // console.log('First 200 chars:', aiResponse.substring(0, 200))
    // console.log('Contains "ASSESSMENT":', aiResponse.includes('ASSESSMENT'))
    // console.log('Contains "GOAL":', aiResponse.includes('GOAL'))
    // console.log('🔍 FULL RAW AI RESPONSE:')
    // console.log('---START FULL AI RESPONSE---')
    // console.log(aiResponse)
    // console.log('---END FULL AI RESPONSE---')

    // Try to parse the AI response as JSON first (we now instruct the model to output a strict JSON schema)
    const assessmentsList: Assessment[] = []
    let parsedJson: unknown = null
    try {
      parsedJson = JSON.parse(aiResponse)
      console.log('AI returned JSON; attempting structured parse')
    } catch {
      console.warn('AI did not return valid JSON, falling back to text parsing')
    }

    if (parsedJson && typeof parsedJson === 'object' && 'assessments' in (parsedJson as object)) {
      const maybe = (parsedJson as { assessments?: unknown }).assessments
      if (Array.isArray(maybe)) {
        // Build assessmentsList from JSON structure
        const pj = parsedJson as { assessments: unknown[] }
        pj.assessments.forEach((a) => {
          if (!a || typeof a !== 'object') return
          const rec = a as { goal?: number; strategies?: unknown[] }
          const idx = (typeof rec.goal === 'number' ? rec.goal - 1 : null)
          if (idx === null || idx < 0 || idx >= approvedGoals.length) return

          // Construct description by joining strategies with clear separators
          const strategies = Array.isArray(rec.strategies) ? rec.strategies : []
          const descriptionParts = strategies.map((s) => {
            if (!s || typeof s !== 'object') return ''
            const strat = s as { title?: string | null; description?: string }
            const title = strat.title ? `**${strat.title}**: ` : ''
            return `${title}${(strat.description || '').trim()}`
          }).filter((p) => p && p.length > 0) as string[]

          const description = descriptionParts.join('\n\n')

          assessmentsList.push({
            id: Date.now() + idx + Math.random() * 1000,
            goalId: approvedGoals[idx].id,
            description: description,
            isRefined: true
          })
        })
      } else {
        // If JSON exists but doesn't match the expected shape, fall through to text parsing below
      }
    } else {
      // Fallback: existing robust free-form text parsing
      const lines = aiResponse.split('\n').filter((line: string) => line.trim())
      console.log('Filtered lines:', lines)

      // First, try the primary parsing method with better validation
      let currentGoalIndex = -1
      let currentAssessmentText = ''

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for assessment headers with more flexible patterns, including markdown headers
        const assessmentMatch = line.match(/^(?:#{1,3}\s*)?(?:ASSESSMENT\s+FOR\s+GOAL\s+(\d+):|GOAL\s+(\d+)\s+ASSESSMENT:|ASSESSMENTS?\s+FOR\s+GOAL\s+(\d+))\s*(.*)$/i)
        
        if (assessmentMatch) {
          const goalNum = assessmentMatch[1] || assessmentMatch[2] || assessmentMatch[3]
          const goalIndex = parseInt(goalNum) - 1
          
          console.log('Found assessment match for goal:', goalNum, 'text:', assessmentMatch[4] || '')
          
          // Validate goal index is within bounds
          if (goalIndex >= 0 && goalIndex < approvedGoals.length) {
            // Save previous assessment if we have one
            if (currentGoalIndex >= 0 && currentAssessmentText.trim() && currentGoalIndex < approvedGoals.length) {
              console.log('Saving previous assessment for goal', currentGoalIndex + 1, ':', currentAssessmentText.trim())
              assessmentsList.push({
                id: Date.now() + currentGoalIndex + Math.random() * 1000,
                goalId: approvedGoals[currentGoalIndex].id,
                description: currentAssessmentText.trim(),
                isRefined: true
              })
            }
            
            // Start new assessment
            currentGoalIndex = goalIndex
            currentAssessmentText = (assessmentMatch[4] || '').trim()
            console.log('Started new assessment for goal index:', currentGoalIndex)
          } else {
            console.warn('Invalid goal index found:', goalIndex, 'Expected 0 to', approvedGoals.length - 1)
          }
        } else if (currentGoalIndex >= 0 && line) {
          // Continue building the current assessment text
          currentAssessmentText += (currentAssessmentText ? ' ' : '') + line
          console.log('Building assessment text for goal', currentGoalIndex + 1, ':', currentAssessmentText.substring(0, 100) + '...')
        }
      }

      // Don't forget the last assessment
      if (currentGoalIndex >= 0 && currentAssessmentText.trim() && currentGoalIndex < approvedGoals.length) {
        console.log('Saving final assessment for goal', currentGoalIndex + 1, ':', currentAssessmentText.trim())
        assessmentsList.push({
          id: Date.now() + currentGoalIndex + Math.random() * 1000,
          goalId: approvedGoals[currentGoalIndex].id,
          description: currentAssessmentText.trim(),
          isRefined: true
        })
      }
    }

    console.log('Primary parsing result - found', assessmentsList.length, 'assessments from', approvedGoals.length, 'goals')

    // Validation: Ensure we have assessments for all goals
    const missingGoalIds = approvedGoals
      .filter(goal => !assessmentsList.some(assessment => assessment.goalId === goal.id))
      .map(goal => goal.id)
    
    if (missingGoalIds.length > 0) {
      console.warn('Missing assessments for goal IDs:', missingGoalIds)
    }

    // If we don't have assessments for all goals or parsing failed entirely, try alternative methods
    if (assessmentsList.length === 0 || assessmentsList.length < approvedGoals.length) {
      console.log('⚠️ PRIMARY PARSING INCOMPLETE - Trying alternatives...')
      console.log('- Current assessments found:', assessmentsList.length)
      console.log('- Expected assessments:', approvedGoals.length)
      console.log('- AI response analysis:')
      console.log('  * Length:', aiResponse.length, 'chars')
      console.log('  * Lines:', aiResponse.split('\n').length)
      console.log('  * Has assessment keywords:', /assessment|strategy|evaluate|measure/i.test(aiResponse))
      
      // Clear existing assessments if primary parsing was incomplete
      if (assessmentsList.length > 0 && assessmentsList.length < approvedGoals.length) {
        console.log('Primary parsing was incomplete, clearing and starting over')
        assessmentsList.length = 0
      }
      
      // Method 1: Try parsing by goal numbers (1., 2., 3., etc.)
      const goalSections = aiResponse.split(/(?=\b(?:GOAL\s+\d+|ASSESSMENT\s+FOR\s+GOAL\s+\d+|\d+\.)\b)/i)
        .filter(section => section.trim().length > 20)
      
      if (goalSections.length >= approvedGoals.length) {
        console.log('Found', goalSections.length, 'goal sections, processing...')
        goalSections.forEach((section, sectionIndex) => {
          if (sectionIndex < approvedGoals.length) {
            // Extract goal number from section header if possible
            const goalNumMatch = section.match(/(?:GOAL\s+(\d+)|ASSESSMENT\s+FOR\s+GOAL\s+(\d+)|^(\d+)\.)/i)
            let targetGoalIndex = sectionIndex // Default to section order
            
            if (goalNumMatch) {
              const goalNum = goalNumMatch[1] || goalNumMatch[2] || goalNumMatch[3]
              const parsedIndex = parseInt(goalNum) - 1
              if (parsedIndex >= 0 && parsedIndex < approvedGoals.length) {
                targetGoalIndex = parsedIndex
              }
            }
            
            // Clean the section text
            const cleanText = section
              .replace(/^(?:GOAL\s+\d+|ASSESSMENT\s+FOR\s+GOAL\s+\d+|\d+\.)\s*:?\s*/i, '')
              .trim()
            
            if (cleanText.length > 15 && !assessmentsList.some(a => a.goalId === approvedGoals[targetGoalIndex].id)) {
              assessmentsList.push({
                id: Date.now() + targetGoalIndex + Math.random() * 1000,
                goalId: approvedGoals[targetGoalIndex].id,
                description: cleanText,
                isRefined: true
              })
              console.log('Alternative method: Added assessment for goal', targetGoalIndex + 1)
            }
          }
        })
      }
      
      // Method 2: If still missing assessments, try paragraph-based splitting
      if (assessmentsList.length < approvedGoals.length) {
        const paragraphs = aiResponse.split(/\n\s*\n/).filter(p => p.trim().length > 20)
        console.log('Trying paragraph-based parsing with', paragraphs.length, 'paragraphs')
        
        paragraphs.forEach((paragraph) => {
          if (assessmentsList.length < approvedGoals.length) {
            const goalIndex = assessmentsList.length // Use current count as index
            assessmentsList.push({
              id: Date.now() + goalIndex + Math.random() * 1000,
              goalId: approvedGoals[goalIndex].id,
              description: paragraph.trim(),
              isRefined: true
            })
            console.log('Paragraph method: Added assessment for goal', goalIndex + 1)
          }
        })
      }
    }

    // Ensure all goals have assessments - create fallbacks for missing ones
    const finalAssessmentsList: Assessment[] = []
    approvedGoals.forEach((goal, goalIndex) => {
      let existingAssessment = assessmentsList.find(assessment => assessment.goalId === goal.id)
      
      if (!existingAssessment) {
        console.log('🔄 CREATING FALLBACK for goal', goalIndex + 1, 'with ID:', goal.id)
        console.log('  - Goal description:', goal.description.substring(0, 80) + '...')
        console.log('  - Course subject:', context.courseSubject)
        console.log('  - RAW AI RESPONSE THAT FAILED TO PARSE:')
        console.log('---START AI RESPONSE---')
        console.log(aiResponse)
        console.log('---END AI RESPONSE---')
        
        // Create a fallback that includes both our fallback text AND the raw AI response for debugging
        const fallback = createSubjectSpecificFallback(context.courseSubject, goalIndex)
        fallback.description = `[PARSING FAILED - SHOWING RAW AI RESPONSE]\n\n${aiResponse}\n\n[END RAW RESPONSE]\n\n${fallback.description}`
        fallback.goalId = goal.id
        existingAssessment = fallback
      } else {
        console.log('Found existing assessment for goal', goalIndex + 1, 'with ID:', goal.id)
      }
      
      finalAssessmentsList.push(existingAssessment)
    })
    
    // Replace the assessments list with the properly ordered and complete list
    assessmentsList.length = 0
    assessmentsList.push(...finalAssessmentsList)

    console.log('Parsed assessments:', assessmentsList)
    
    callbacks.setLoadingMessage('Finalizing assessment strategies...')
    callbacks.setProgress(100)
    
    // Final validation and logging
    console.log('=== FINAL ASSESSMENT GENERATION SUMMARY ===')
    console.log('Expected goals count:', approvedGoals.length)
    console.log('Generated assessments count:', assessmentsList.length)
    console.log('Goals:', approvedGoals.map((g, i) => ({ index: i + 1, id: g.id, description: g.description.substring(0, 50) + '...' })))
    console.log('Assessments:', assessmentsList.map((a, i) => ({ index: i + 1, id: a.id, goalId: a.goalId, description: a.description.substring(0, 50) + '...' })))
    
    // Verify mapping
    const mappingErrors: string[] = []
    approvedGoals.forEach((goal, goalIndex) => {
      const matchingAssessment = assessmentsList.find(a => a.goalId === goal.id)
      if (!matchingAssessment) {
        mappingErrors.push(`Goal ${goalIndex + 1} (ID: ${goal.id}) has no matching assessment`)
      }
    })
    
    if (mappingErrors.length > 0) {
      console.error('ASSESSMENT MAPPING ERRORS:', mappingErrors)
    } else {
      console.log('✓ All goals have matching assessments')
    }
    console.log('=== END SUMMARY ===')
    
    callbacks.setRefinedAssessments(assessmentsList)
    callbacks.setCurrentStep('assessments')
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
    callbacks.setCurrentStep('assessments')
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
        assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
      },
      {
        id: Date.now() + goalIndex * 3 + 1,
        goalId: goal.id,
        bloomLevel: 'Analyze',
        description: `Analyze print quality issues and determine appropriate solutions for different printing scenarios`,
        assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
      }
    ]
  } else if (goalText.includes('troubleshoot') || goalText.includes('problem')) {
    objectives = [
      {
        id: Date.now() + goalIndex * 3,
        goalId: goal.id,
        bloomLevel: 'Analyze',
        description: `Analyze and identify root causes of technical problems systematically`,
        assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
      },
      {
        id: Date.now() + goalIndex * 3 + 1,
        goalId: goal.id,
        bloomLevel: 'Apply',
        description: `Apply troubleshooting methodologies to resolve technical issues effectively`,
        assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
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
        assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
      },
      {
        id: Date.now() + goalIndex * 3 + 1,
        goalId: goal.id,
        bloomLevel: 'Analyze',
        description: `Analyze situations and evaluate appropriate approaches for achieving the learning goal`,
        assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
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

    const prompt = `You are creating learning objectives for a ${context.courseType} on "${context.courseSubject}".

INSTRUCTIONAL CONTEXT:
- Subject: ${context.courseSubject}
- Target Audience: ${context.targetAudience}
- Duration: ${context.instructionDuration}

GOALS AND ASSESSMENTS:
${goalsText}

${assessmentsText}

TASK: For each goal, create 2-3 learning objectives that are COMPLETELY DIFFERENT from each other.

ABSOLUTE REQUIREMENTS - EACH OBJECTIVE MUST:

1. Focus on ONE specific sub-skill, concept, or competency within the goal
2. Use a DIFFERENT action verb from Bloom's Taxonomy
3. Include DIFFERENT specific details, tools, methods, or contexts
4. NOT repeat the same sentence structure or phrasing as other objectives
5. Build in cognitive complexity from foundational to advanced

STEP-BY-STEP PROCESS FOR EACH GOAL:

Step 1: Break the goal into 2-3 DISTINCT components or sub-skills
Step 2: For each component, write ONE objective using the appropriate Bloom's level
Step 3: Ensure each objective addresses a DIFFERENT aspect and uses DIFFERENT wording

BLOOM'S TAXONOMY LEVELS (choose the appropriate verb for each objective's complexity):
- Apply: demonstrate, execute, implement, solve, use, operate, perform
- Analyze: compare, contrast, differentiate, examine, categorize, break down
- Evaluate: critique, judge, justify, assess, defend, appraise
- Create: design, develop, construct, formulate, generate, produce

FORBIDDEN PATTERNS (DO NOT DO THIS):
❌ "Demonstrate key concepts related to [topic]"
❌ "Analyze key concepts related to [topic]"  
❌ "Evaluate key concepts related to [topic]"
❌ Using the exact same sentence with only the verb changed

REQUIRED PATTERN (DO THIS INSTEAD):
✅ Each objective must have UNIQUE content after the verb
✅ Each objective must specify WHAT specific skill/knowledge is being addressed
✅ Each objective must be independently assessable

EXAMPLE FOR "Students will prepare a digital model for 3D printing":

Component 1 - Software operation:
• Apply: Operate slicing software to configure basic print parameters including layer height, infill density, and support placement for a given 3D model.

Component 2 - Decision-making:
• Analyze: Compare how different parameter choices (print speed, support density, infill patterns) affect print time, material usage, and structural integrity.

Component 3 - Quality assessment:
• Evaluate: Assess a sliced file's readiness for printing by examining whether settings match the model's geometry, material requirements, and functional purpose.

Notice: Each objective focuses on a DIFFERENT skill (operating software vs. comparing options vs. assessing quality) with DIFFERENT specific content.

Now create objectives for each goal following this pattern. Each objective MUST have different content and focus on a distinct aspect of the goal.

CRITICAL FORMAT REQUIREMENTS:
- Start each goal section with EXACTLY: "OBJECTIVES FOR GOAL [number]:" (no markdown headers, no extra text after the colon)
- Use bullet points with the bullet character • (not -, *, or ##)
- Format each objective as: "• [Bloom Level]: [Objective text]"
- Do NOT add goal titles or descriptions after the colon
- Do NOT use markdown headers (##, ###, etc.)

CORRECT FORMAT EXAMPLE:

OBJECTIVES FOR GOAL 1:
• Apply: Operate slicing software to configure basic print parameters including layer height, infill density, and support placement for a given 3D model
• Analyze: Compare how different parameter choices affect print time, material usage, and structural integrity
• Evaluate: Assess a sliced file's readiness for printing by examining whether settings match the model's geometry and material requirements

OBJECTIVES FOR GOAL 2:
• Apply: Use technical vocabulary related to 3D printer components correctly when documenting setup procedures
• Analyze: Categorize 3D printing terminology into functional groups to explain relationships between aspects of the workflow

Continue for all goals. Remember: NO REPEATED CONTENT - each objective must address a unique aspect.`

    const aiResponse = await callAIFunction(prompt, 'generate-objectives')

    callbacks.setLoadingMessage('Processing learning objectives...')
    callbacks.setProgress(80)

    console.log('\n\n════════════════════════════════════════════════════════════')
    console.log('🎯 OBJECTIVES AI RESPONSE DEBUG')
    console.log('════════════════════════════════════════════════════════════')
    console.log('Response length:', aiResponse.length, 'characters')
    console.log('Number of lines:', aiResponse.split('\n').length)
    console.log('Contains "OBJECTIVES FOR GOAL":', aiResponse.includes('OBJECTIVES FOR GOAL'))
    console.log('Number of bullet points (•):', (aiResponse.match(/•/g) || []).length)
    console.log('Number of hyphens (-):', (aiResponse.match(/^-/gm) || []).length)
    console.log('\n📄 FULL RAW OBJECTIVES AI RESPONSE:')
    console.log('---START OBJECTIVES RESPONSE---')
    console.log(aiResponse)
    console.log('---END OBJECTIVES RESPONSE---')
    console.log('════════════════════════════════════════════════════════════\n\n')

    // Parse AI response and create learning objectives
    const objectivesList: LearningObjective[] = []
    const lines = aiResponse.split('\n').filter((line: string) => line.trim())
    
    let currentGoalIndex = -1
    let objectiveId = Date.now()

    console.log('🔍 Starting to parse objectives from', lines.length, 'lines')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for objective headers (more flexible matching to handle markdown headers and extra text)
      // Matches: "OBJECTIVES FOR GOAL 1:", "## OBJECTIVES FOR GOAL 1:", "OBJECTIVES FOR GOAL 1: Troubleshooting"
      const objectiveMatch = line.match(/^#{0,3}\s*OBJECTIVES\s+FOR\s+GOAL\s+(\d+):/i)
      
      if (objectiveMatch) {
        currentGoalIndex = parseInt(objectiveMatch[1]) - 1
        console.log('✅ Found objectives header for goal index:', currentGoalIndex, '(Goal ID:', approvedGoals[currentGoalIndex]?.id, ')')
      } else if (currentGoalIndex >= 0 && currentGoalIndex < approvedGoals.length) {
        // Look for lines that start with bullet points or contain Bloom level indicators
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          // Parse individual objective with Bloom level
          const objectiveText = line.replace(/^[•\-*]\s*/, '').trim()
          console.log('  📌 Parsing bullet point:', objectiveText.substring(0, 80) + '...')
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
              assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
            })
            console.log('  ✅ Added objective for goal', currentGoalIndex + 1, '- Bloom:', bloomLevel)
            console.log('     Description:', description.substring(0, 100) + (description.length > 100 ? '...' : ''))
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
                assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
              })
              console.log('Added objective with detected Bloom level:', firstWord, objectiveText)
            }
          }
        }
      }
    }

    console.log('\n📊 OBJECTIVES PARSING SUMMARY:')
    console.log('  Total objectives parsed:', objectivesList.length)
    console.log('  Expected objectives (goals × 2-3):', approvedGoals.length * 2, '-', approvedGoals.length * 3)
    console.log('  Objectives by goal:')
    approvedGoals.forEach((goal, idx) => {
      const count = objectivesList.filter(obj => obj.goalId === goal.id).length
      console.log(`    Goal ${idx + 1}: ${count} objectives`)
    })
    console.log('\n📋 Final parsed learning objectives:', JSON.stringify(objectivesList, null, 2))
    console.log('════════════════════════════════════════════════════════════\n')

    // If no objectives were parsed, try alternative parsing or create better fallbacks
    if (objectivesList.length === 0) {
      console.log('⚠️ No objectives parsed, creating enhanced fallback objectives')
      const fallbackObjectives = approvedGoals.flatMap((goal, goalIndex) => {
        const relatedAssessment = approvedAssessments.find(a => a.goalId === goal.id)
        const bloomLevels = ['Apply', 'Analyze', 'Evaluate']
        const verbs = ['Demonstrate', 'Analyze', 'Evaluate']
        
        return bloomLevels.map((level, levelIndex) => ({
          id: objectiveId + goalIndex * 3 + levelIndex,
          goalId: goal.id,
          bloomLevel: level,
          description: `${verbs[levelIndex]} key concepts and skills related to: ${goal.description}`,
          assessmentAlignment: relatedAssessment ? relatedAssessment.description : 'Assessment alignment needed'
        }))
      })
      objectivesList.push(...fallbackObjectives)
    }

    callbacks.setLoadingMessage('Finalizing learning objectives...')
    callbacks.setProgress(100)

    callbacks.setRefinedObjectives(objectivesList)
    callbacks.setCurrentStep('review-objectives')
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
    callbacks.setCurrentStep('review-objectives')
  } finally {
    callbacks.setIsRefining(false)
    callbacks.setLoadingMessage('')
    callbacks.setProgress(0)
  }
}