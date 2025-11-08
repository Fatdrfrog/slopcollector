import { cn } from './utils';

interface KeyboardHintProps {
  keys: string[];
  className?: string;
}

/**
 * Keyboard Hint Component
 * Shows keyboard shortcuts in a visually appealing way
 * Improves accessibility and UX
 */
export function KeyboardHint({ keys, className }: KeyboardHintProps) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-sm"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

