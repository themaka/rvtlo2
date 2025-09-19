import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable minification and compression
    minify: 'terser',
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk for React and related libraries
          'react-vendor': ['react', 'react-dom'],
          
          // AI service as separate chunk (heavy functionality)
          'ai-service': ['./src/services/aiService.ts'],
          
          // Utility functions as separate chunk
          'utils': ['./src/utils/validation.ts', './src/utils/navigation.ts', './src/utils/errorHandling.ts']
        }
      }
    },
    
    // Target modern browsers for better optimization
    target: 'es2020',
    
    // Enable source maps for debugging in production
    sourcemap: true,
    
    // Optimize CSS
    cssMinify: true,
    
    // Bundle analysis
    reportCompressedSize: true
  },
  
  // Optimize development
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
