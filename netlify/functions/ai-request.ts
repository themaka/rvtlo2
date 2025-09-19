// Netlify Function to handle AI requests securely
// This runs server-side, keeping the API key secure

import { Handler, HandlerEvent } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY  // Server-side env var (no VITE_ prefix)
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { prompt, type } = JSON.parse(event.body || '{}')
    
    if (!prompt || !type) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        body: JSON.stringify({ error: 'Missing prompt or type' })
      }
    }

    console.log(`Processing ${type} request`)

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ 
        response: aiResponse,
        type: type
      })
    }

  } catch (error) {
    console.error('AI API Error:', error)
    
    // Determine error type and provide appropriate response
    let statusCode = 500
    let errorMessage = 'Failed to process AI request'
    let errorDetails = 'Unknown error'

    if (error instanceof Error) {
      errorDetails = error.message
      
      // Handle specific Anthropic API errors
      if (error.message.includes('401') || error.message.includes('authentication')) {
        statusCode = 401
        errorMessage = 'API authentication failed'
        errorDetails = 'Invalid API key or authentication issue'
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        statusCode = 403
        errorMessage = 'API access forbidden'
        errorDetails = 'API key lacks required permissions or billing issue'
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        statusCode = 429
        errorMessage = 'Rate limit exceeded'
        errorDetails = 'Too many requests to the AI service'
      } else if (error.message.includes('timeout')) {
        statusCode = 504
        errorMessage = 'Request timeout'
        errorDetails = 'AI service request timed out'
      } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
        statusCode = 502
        errorMessage = 'Network error'
        errorDetails = 'Unable to connect to AI service'
      }
    }
    
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      body: JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        retryable: statusCode >= 500 || statusCode === 429
      })
    }
  }
}