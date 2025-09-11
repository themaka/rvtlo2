import { useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import './App.css'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1000,
        messages: [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content[0].type === 'text' ? response.content[0].text : ''
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your message.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <h1>AI Chat with Claude</h1>
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Claude'}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div className="message assistant">Claude is typing...</div>}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

export default App
