interface HeaderProps {
  tableCount: number;
  showSuggestions: boolean;
  onToggleSuggestions: () => void;
  onOpenCommandPalette: () => void;
}

/**
 * Application header with controls
 */
export function Header({
  tableCount,
  showSuggestions,
  onToggleSuggestions,
  onOpenCommandPalette,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-800 bg-[#1a1a1a] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <h1 className="text-gray-100">Database Schema</h1>
        <span className="text-gray-600 text-sm">·</span>
        <span className="text-gray-400 text-sm">{tableCount} tables</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSuggestions}
          className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
        >
          {showSuggestions ? 'Hide' : 'Show'} Suggestions
        </button>
        
        <button
          onClick={onOpenCommandPalette}
          className="px-3 py-1.5 text-sm bg-white text-black hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2"
        >
          Command Palette
          <kbd className="px-1.5 py-0.5 text-xs bg-gray-300 rounded">⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
