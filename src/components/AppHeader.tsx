interface AppHeaderProps {
  showHelp: boolean
  onToggleHelp: () => void
}

export function AppHeader({ showHelp, onToggleHelp }: AppHeaderProps) {
  return (
    <div className="header-content">
      <div className="header-left">
        <h1>Course Goal Builder</h1>
      </div>
      <div className="header-right">
        <button 
          className="help-button"
          onClick={onToggleHelp}
          aria-label="Toggle help"
        >
          {showHelp ? '✕ Close Help' : '? Help'}
        </button>
      </div>
    </div>
  )
}