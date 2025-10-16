/**
 * Robust clipboard utility with multiple fallback strategies
 */

/**
 * Copy text to clipboard using the most reliable method available
 * @param text - The text to copy
 * @returns Promise<boolean> - true if successful, false if all methods failed
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern Clipboard API (preferred)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err)
    }
  }

  // Method 2: Legacy execCommand (broader browser support)
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    
    // Make it invisible but still functional
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    textarea.setAttribute('readonly', '')
    
    document.body.appendChild(textarea)
    
    // Select the text
    textarea.focus()
    textarea.select()
    
    // For iOS support
    textarea.setSelectionRange(0, text.length)
    
    // Execute copy command
    const successful = document.execCommand('copy')
    
    // Clean up
    document.body.removeChild(textarea)
    
    if (successful) {
      return true
    }
  } catch (err) {
    console.warn('execCommand failed:', err)
  }

  // Method 3: All methods failed - caller should show manual copy modal
  return false
}

/**
 * Check if clipboard functionality is available
 */
export function isClipboardSupported(): boolean {
  return !!(
    (navigator.clipboard && window.isSecureContext) ||
    document.queryCommandSupported?.('copy')
  )
}
