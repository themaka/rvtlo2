// Canvas LMS Compatible AI Service
// Users provide their own API keys for full functionality

// Check if we're in Canvas/static mode (no Netlify functions)
const isStaticMode = !window.location.hostname.includes('netlify.app')

// Helper function - direct API call with user's key
async function callAnthropicDirectly(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Helper function - call our secure Netlify function (when available)
async function callNetlifyFunction(prompt: string, type: string): Promise<string> {
  const response = await fetch('/.netlify/functions/ai-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, type })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  return data.response
}

// Main AI function that works in both environments
async function callAIFunction(prompt: string, type: string, userApiKey?: string): Promise<string> {
  if (isStaticMode || userApiKey) {
    if (!userApiKey) {
      throw new Error('API key required for AI functionality. Please enter your Anthropic API key.')
    }
    return callAnthropicDirectly(prompt, userApiKey)
  } else {
    return callNetlifyFunction(prompt, type)
  }
}

export { callAIFunction, isStaticMode }