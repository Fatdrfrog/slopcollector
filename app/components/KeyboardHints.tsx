interface KeyboardHintProps {
  shortcut: string;
  label: string;
}

function KeyboardHint({ shortcut, label }: KeyboardHintProps) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 bg-[#0f0f0f] rounded border border-gray-700 text-gray-300">
        {shortcut}
      </kbd>
      <span>{label}</span>
    </span>
  );
}

/**
 * Display keyboard shortcuts hints
 */
export function KeyboardHints() {
  return (
    <div className="absolute bottom-4 left-4 bg-[#1a1a1a]/90 backdrop-blur-sm border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 shadow-lg z-10">
      <div className="flex items-center gap-4">
        <KeyboardHint shortcut="⌘K" label="Command" />
        <KeyboardHint shortcut="Tab" label="Next" />
        <KeyboardHint shortcut="⌘B" label="Suggestions" />
        <KeyboardHint shortcut="Esc" label="Clear" />
      </div>
    </div>
  );
}
