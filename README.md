# Course Goal Builder (RVTLO2)

A React + TypeScript application for creating learning objectives using backward design principles with AI-powered assistance.

## Table of Contents

- [Project Overview](#project-overview)
- [File Structure](#file-structure)
- [Refactoring Progress](#refactoring-progress)
- [Technology Stack](#technology-stack)
- [Development Setup](#development-setup)
- [Architecture](#architecture)
- [Original Vite Configuration](#original-vite-configuration)

## Project Overview

The Course Goal Builder is an educational design tool that helps instructors create comprehensive learning frameworks using backward design methodology. The application guides users through defining course goals, assessment strategies, and learning objectives with AI assistance from Anthropic's Claude API.

### Key Features
- **Backward Design Workflow**: Step-by-step process for course planning
- **AI-Powered Refinement**: Claude API integration for goal and assessment improvement
- **Bloom's Taxonomy Integration**: Learning objectives aligned with educational standards
- **Progress Tracking**: Visual workflow with navigation between steps
- **Input Validation**: Comprehensive form validation with user feedback

## File Structure

```
src/
├── 📄 App.tsx (1,132 lines) - Main React component
├── 📄 App.css - Main application styling
├── 📄 index.css - Global styles  
├── 📄 main.tsx (10 lines) - React entry point
├── 📄 vite-env.d.ts (1 line) - Vite type definitions
├── 📁 assets/
│   └── react.svg - React logo
├── 📁 types/ ✅ **Phase 1 Complete**
│   └── 📄 index.ts (93 lines) - TypeScript interfaces & types
├── 📁 utils/ ✅ **Phases 2 & 4 Complete** 
│   ├── 📄 validation.ts (224 lines) - Input validation logic
│   └── 📄 navigation.ts (196 lines) - Workflow navigation utilities
└── 📁 services/ ✅ **Phase 3 Complete**
    └── 📄 aiService.ts (631 lines) - AI API calls & prompt templates
```

### Module Breakdown

#### **types/index.ts** (93 lines)
- `Goal`, `Assessment`, `LearningObjective` interfaces
- `Step` union type for workflow states  
- `CourseContext` for AI service context
- Centralized TypeScript type definitions

#### **utils/validation.ts** (224 lines)
- `validateAndConfirmSubject()` - Course subject validation
- `validateAndCompleteSetup()` - Target audience & duration validation  
- `validateAndAddGoal()` - Goal input validation
- Pure functions with consistent error handling

#### **utils/navigation.ts** (196 lines)
- `getStepStatus()` - Progress indicator logic
- `canNavigateToStep()` - Navigation permission rules
- `navigateToStep()` - Safe step transitions
- `resetApplication()` - Complete state reset
- Workflow management utilities

#### **services/aiService.ts** (631 lines)
- `refineGoalsWithAI()` - Goal refinement with Claude API
- `generateAssessments()` - Assessment strategy generation
- `generateLearningObjectives()` - Bloom's taxonomy objectives
- Centralized AI API integration

#### **App.tsx** (1,132 lines - REDUCED from ~1,700 lines)
- Main React component with workflow UI
- State management (to be extracted in Phase 6)
- Render methods (to be extracted in Phase 5)
- Focused on UI presentation

## Refactoring Progress

**✅ Completed Phases (40% Complete):**
- **Phase 1**: Extract type definitions ✅
- **Phase 2**: Create validation utilities ✅
- **Phase 3**: Extract AI service functions ✅
- **Phase 4**: Create navigation utilities ✅

**🔄 Remaining Phases:**
- **Phase 5**: Extract UI components (render methods → reusable components)
- **Phase 6**: State management layer (Context API/reducer patterns)
- **Phase 7**: Styling utilities (CSS organization)
- **Phase 8**: Error boundaries (robust error handling)
- **Phase 9**: Performance optimization (memoization, lazy loading)
- **Phase 10**: Testing framework (unit & integration tests)

### Impact Summary
- **~568 lines** extracted from App.tsx into focused modules
- **4 new utility/service modules** with clear responsibilities
- **Improved separation of concerns** - types, validation, navigation, AI logic
- **Better testability** - isolated pure functions
- **Enhanced maintainability** - easier to find and modify functionality

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **AI Integration**: Anthropic Claude API (claude-3-7-sonnet-20250219)
- **Styling**: CSS with custom properties
- **Build Tool**: Vite with TypeScript support
- **Linting**: ESLint with TypeScript configuration

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rvtlo2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env` file with:
   ```
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## Architecture

The application follows a **modular architecture** with clear separation of concerns:

- **Presentation Layer**: React components and UI logic (App.tsx)
- **Service Layer**: External API integration (services/)
- **Utility Layer**: Pure functions for business logic (utils/)
- **Type Layer**: TypeScript definitions and interfaces (types/)

This architecture promotes:
- **Testability**: Isolated modules can be unit tested independently
- **Maintainability**: Clear boundaries between different concerns
- **Reusability**: Utility functions can be shared across components
- **Type Safety**: Comprehensive TypeScript coverage

---

## Original Vite Configuration

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
