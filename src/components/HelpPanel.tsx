import type { Step } from '../types'

interface HelpPanelProps {
  currentStep: Step
  isVisible: boolean
  onClose: () => void
}

interface HelpContent {
  title: string
  content: string[]
}

export function HelpPanel({ currentStep, isVisible, onClose }: HelpPanelProps) {
  const getHelpContent = (step: Step): HelpContent | null => {
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

  const helpContent = getHelpContent(currentStep)
  if (!helpContent || !isVisible) return null
  
  return (
    <div className="help-panel">
      <div className="help-header">
        <h4>💡 {helpContent.title}</h4>
        <button 
          className="help-close"
          onClick={onClose}
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