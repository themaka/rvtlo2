// Debug component to check environment variables
// This should be removed before production deployment

import React from 'react'

const DebugEnvVars: React.FC = () => {
  const envVars = import.meta.env
  const anthropicKey = envVars.VITE_ANTHROPIC_API_KEY

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>🔍 Environment Debug</h4>
      <div>
        <strong>Has VITE_ANTHROPIC_API_KEY:</strong> {anthropicKey ? '✅ Yes' : '❌ No'}
      </div>
      {anthropicKey && (
        <div>
          <strong>Key Length:</strong> {anthropicKey.length}
        </div>
      )}
      {anthropicKey && (
        <div>
          <strong>Key Prefix:</strong> {anthropicKey.substring(0, 15)}...
        </div>
      )}
      <div>
        <strong>All VITE_ vars:</strong> {Object.keys(envVars).filter(k => k.startsWith('VITE_')).join(', ') || 'None'}
      </div>
      <div>
        <strong>Mode:</strong> {envVars.MODE}
      </div>
      <div>
        <strong>Prod:</strong> {envVars.PROD ? 'Yes' : 'No'}
      </div>
    </div>
  )
}

export default DebugEnvVars