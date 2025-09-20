# Course Goal Builder (RVTLO2)

A React + TypeScript application for creating learning objectives using backward design principles with AI-powered assistance.

## Table of Contents

- [Project Overview](#project-overview)
- [File Structure](#file-structure)
- [Technology Stack](#technology-stack)
- [Development Setup](#development-setup)
- [Build & Deployment Configuration](#build--deployment-configuration)
- [Architecture](#architecture)
- [Next Steps & Future Enhancements](#next-steps--future-enhancements)
- [Original Vite Configuration](#original-vite-configuration)

## Project Overview

The Course Goal Builder is an educational design tool that helps instructors create comprehensive learning frameworks using backward design methodology. The application guides users through defining course goals, assessment strategies, and learning objectives with AI assistance from Anthropic's Claude API.

### Key Features
- **Backward Design Workflow**: Step-by-step process for course planning
- **AI-Powered Refinement**: Claude API integration for goal and assessment improvement
- **Bloom's Taxonomy Integration**: Learning objectives aligned with educational standards
- **Progress Tracking**: Visual workflow with navigation between steps
- **Input Validation**: Comprehensive form validation with user feedback
- **Robust Error Handling**: Error boundaries and graceful failure recovery
- **Performance Optimized**: Component memoization, code splitting, and memory management
- **Modern Architecture**: Modular design with React Context, lazy loading, and TypeScript

## File Structure

```
src/
├── 📄 App.tsx - Main React component with Context integration
├── 📄 App.css - Main application styling
├── 📄 index.css - Global styles  
├── 📄 main.tsx - React entry point
├── 📄 vite-env.d.ts - Vite type definitions
├── 📁 assets/
│   └── react.svg - React logo
├── 📁 components/
│   ├── 📄 index.ts - Component exports
│   ├── 📄 AppHeader.tsx - Application header with navigation
│   ├── 📄 ButtonGroup.tsx - Reusable button groups
│   ├── 📄 ErrorBoundary.tsx - React error boundary wrapper
│   ├── 📄 ErrorMessage.tsx - Error display components
│   ├── 📄 HelpPanel.tsx - Contextual help system
│   ├── 📄 LazyComponents.tsx - Code splitting utilities
│   ├── 📄 LoadingIndicator.tsx - Loading state displays
│   ├── 📄 ProgressIndicator.tsx - Workflow progress tracking
│   ├── 📄 StepContainer.tsx - Step wrapper components
│   ├── 📄 ValidatedInput.tsx - Form input with validation
│   └── 📄 withErrorBoundary.tsx - HOC for error handling
├── 📁 context/
│   └── 📄 AppContext.tsx - React Context with state management
├── 📁 types/
│   └── 📄 index.ts - TypeScript interfaces & types
├── 📁 utils/
│   ├── 📄 validation.ts - Input validation logic
│   ├── 📄 navigation.ts - Workflow navigation utilities
│   └── 📄 errorHandling.ts - Error handling utilities
└── 📁 services/
    ├── 📄 aiService.ts - AI API calls & prompt templates
    ├── 📄 aiService-canvas.ts - Canvas-based AI interactions
    └── 📄 lazyAIService.ts - Lazy-loaded AI service utilities
```

### Key Components & Modules

#### **Components (12 reusable components)**
- **AppHeader.tsx** - Application header with navigation and branding
- **ButtonGroup.tsx** - Reusable button group components with consistent styling
- **ErrorBoundary.tsx** - React error boundary for graceful error handling
- **ErrorMessage.tsx** - Error display components with user-friendly messaging
- **HelpPanel.tsx** - Contextual help system with step-specific guidance
- **LazyComponents.tsx** - Code splitting utilities with lazy loading
- **LoadingIndicator.tsx** - Loading state displays for async operations
- **ProgressIndicator.tsx** - Workflow progress tracking with visual feedback
- **StepContainer.tsx** - Step wrapper components for consistent layout
- **ValidatedInput.tsx** - Form input components with real-time validation
- **withErrorBoundary.tsx** - Higher-order component for error boundary wrapping

#### **State Management**
- **AppContext.tsx** - React Context provider with centralized state management for goals, assessments, learning objectives, and workflow state

#### **Core Services**
- **aiService.ts** - Claude API integration for goal refinement, assessment generation, and learning objectives
- **lazyAIService.ts** - Lazy-loaded AI service utilities for performance optimization

#### **Utilities**
- **validation.ts** - Form validation functions for course setup and goal input
- **navigation.ts** - Workflow navigation logic and step management
- **errorHandling.ts** - Error classification and user-friendly error messaging

#### **Type Definitions**
- **types/index.ts** - TypeScript interfaces for Goal, Assessment, LearningObjective, and workflow state

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: React Context API with memoized providers
- **Performance**: React.memo, useCallback/useMemo, code splitting
- **Error Handling**: Error boundaries with graceful failure recovery
- **AI Integration**: Anthropic Claude API (claude-3-7-sonnet-20250219)
- **Styling**: CSS with custom properties and component-based organization
- **Build Tool**: Vite with optimized Rollup configuration and chunk splitting
- **Code Quality**: ESLint with TypeScript configuration and Prettier
- **Deployment**: Netlify with environment variable management

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
   
   **Local Development:**
   
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env and add your Anthropic API key
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```
   
   **Netlify Deployment:**
   1. Go to your Netlify site dashboard
   2. Navigate to Site settings → Environment variables
   3. Add: `VITE_ANTHROPIC_API_KEY` with your API key value
   
   Get your API key from: [Anthropic Console](https://console.anthropic.com/)

4. **Development Server**
   
   ```bash
   npm run dev
   ```

5. **Build for Production**
   
   ```bash
   npm run build
   ```

## Build & Deployment Configuration

### **Vite Configuration (`vite.config.ts`)**

The application uses advanced Vite configuration for optimal production builds:

```typescript
// Build optimizations include:
- **Terser Minification**: Advanced code compression and optimization
- **Chunk Splitting**: Strategic separation for better caching
  - `react-vendor`: React/ReactDOM for long-term caching
  - `ai-service`: AI-related modules for targeted updates
  - `utils`: Utility functions for shared functionality
- **Source Maps**: Development debugging support
- **ES2020 Target**: Modern JavaScript features for better performance
```

### **Bundle Analysis**
- **Total Bundle Size**: ~252 kB (optimized from original ~245 kB)
- **Chunk Distribution**: Strategic splitting for optimal caching
- **Loading Strategy**: Lazy loading with preload capabilities

### **Netlify Deployment**
- **Automatic Builds**: Connected to GitHub repository
- **Environment Variables**: Secure API key management
- **CDN Distribution**: Global edge network for fast loading

## Architecture

The application follows a **modern React architecture** with enterprise-level patterns:

### **Architectural Layers**
- **Presentation Layer**: Memoized React components with error boundaries
- **State Management**: React Context API with optimized providers
- **Service Layer**: Lazy-loaded external API integration with error handling
- **Utility Layer**: Pure functions for business logic and validation
- **Type Layer**: Comprehensive TypeScript definitions and interfaces

### **Design Patterns**
- **Component Composition**: Reusable UI components with consistent interfaces
- **Error Boundary Pattern**: Graceful error handling and recovery mechanisms
- **Lazy Loading Pattern**: Code splitting for performance optimization
- **Memoization Pattern**: Strategic React.memo and hook optimization
- **Context Provider Pattern**: Centralized state with memoized providers

### **Performance Optimizations**
- **React.memo()**: Prevents unnecessary component re-renders
- **useCallback/useMemo**: Optimizes expensive computations and object creation
- **Code Splitting**: Lazy loading with React.lazy and Suspense
- **Bundle Optimization**: Advanced Vite/Rollup configuration with chunk splitting
- **Memory Management**: Proper cleanup in useEffect hooks

This architecture promotes:

- **Performance**: Optimized rendering and memory usage
- **Maintainability**: Clear separation of concerns and modular design
- **Scalability**: Component-based architecture that grows with requirements
- **Reliability**: Error boundaries and graceful failure handling
- **Developer Experience**: TypeScript integration and modern tooling

## Next Steps & Future Enhancements

The application now has a solid foundation for future development. Potential areas for enhancement include:

### **Testing Framework**
- Unit tests for utility functions and components
- Integration tests for user workflows
- End-to-end testing with Playwright or Cypress
- Component testing with React Testing Library

### **Advanced Features**
- Progressive Web App (PWA) capabilities
- Offline support with service workers
- Advanced accessibility (WCAG compliance)
- Internationalization (i18n) support
- Advanced analytics and user tracking

### **Maintenance & Monitoring**
- Performance monitoring with Web Vitals
- Error tracking and logging
- Bundle size monitoring
- Dependency updates and security patches

The current architecture provides a robust foundation that can scale with these future enhancements while maintaining performance and maintainability.

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
