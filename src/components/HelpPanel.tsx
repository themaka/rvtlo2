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
      saved: {
        title: "Goals Complete - What's Next?",
        content: [
          "Your refined goals are now saved and ready for the next phase of backward design.",
          "Next, you'll create assessment strategies that directly measure these goals.",
          "If you want to make changes, use the 'Start Over' button to return to the beginning.",
          "Assessment design ensures your students can demonstrate goal achievement."
        ]
      },
      'assessment-review': {
        title: "Reviewing Assessment Strategies",
        content: [
          "Review each assessment strategy to ensure it aligns with your learning goals.",
          "Look for clear connections between what students will do and what you want them to achieve.",
          "Consider the balance of formative (ongoing) and summative (final) assessments.",
          "If strategies don't match your vision, click 'Revise Assessments' to generate new ones."
        ]
      },
      'assessment-saved': {
        title: "Assessments Complete - Final Phase",
        content: [
          "Your assessment strategies are saved and aligned with your learning goals.",
          "Next, you'll create specific learning objectives using Bloom's Taxonomy.",
          "These objectives will bridge your goals and assessments with daily activities.",
          "Use 'Start Over' if you need to make changes to goals or assessments."
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
      },
      'objectives-review': {
        title: "Reviewing Learning Objectives",
        content: [
          "Check that objectives are specific, measurable, and use appropriate Bloom's Taxonomy verbs.",
          "Ensure each objective connects clearly to both your goals and assessment strategies.",
          "Look for a good mix of cognitive levels (Remember through Create) appropriate for your audience.",
          "Click 'Revise Objectives' if you need the AI to generate different or additional objectives."
        ]
      },
      'objectives-saved': {
        title: "Backward Design Complete!",
        content: [
          "Congratulations! You've completed a full backward design framework.",
          "Your goals, assessments, and objectives are now aligned and ready for implementation.",
          "Use this framework to guide your lesson planning and curriculum development.",
          "Click 'Create New Framework' to start over for a different course or workshop."
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