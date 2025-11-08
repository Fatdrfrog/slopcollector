import { useEffect } from 'react';

interface KeyboardShortcutHandlers {
  onCommandK?: () => void;
  onEscape?: () => void;
  onTab?: () => void;
}

/**
 * Custom hook to handle keyboard shortcuts for the application
 * @param handlers - Object containing callback functions for each shortcut
 * @param dependencies - Array of dependencies to re-register shortcuts
 */
export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  dependencies: unknown[] = []
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K - Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handlers.onCommandK?.();
      }
      
      // Escape - Clear selection/close modals
      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
      
      // Tab - Navigate between tables
      if (e.key === 'Tab') {
        e.preventDefault();
        handlers.onTab?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
}
