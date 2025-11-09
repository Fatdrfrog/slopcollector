'use client';

import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebugPanelProps {
  activeProjectId?: string;
  projectsCount: number;
  suggestionsCount: number;
  tablesCount: number;
  userId?: string;
}

/**
 * Debug panel for troubleshooting data issues
 * Shows in development only
 */
export function DebugPanel({
  activeProjectId,
  projectsCount,
  suggestionsCount,
  tablesCount,
  userId,
}: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#2a2a2a] border border-[#7ed321]/30 rounded-lg text-xs text-[#7ed321] hover:bg-[#3a3a3a] transition-colors shadow-xl"
      >
        <Bug className="w-4 h-4" />
        Debug
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-12 right-0 w-80 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-white mb-3 font-mono">Debug Info</h3>
            <div className="space-y-2 text-xs font-mono">
              <DebugRow label="User ID" value={userId || 'Not logged in'} />
              <DebugRow label="Active Project" value={activeProjectId || 'None'} />
              <DebugRow label="Projects Count" value={projectsCount.toString()} />
              <DebugRow label="Tables Count" value={tablesCount.toString()} />
              <DebugRow 
                label="Suggestions Count" 
                value={suggestionsCount.toString()}
                highlight={suggestionsCount === 0}
              />
              <DebugRow label="Environment" value={process.env.NODE_ENV || 'unknown'} />
            </div>

            {suggestionsCount === 0 && (
              <div className="mt-3 pt-3 border-t border-[#3a3a3a] text-xs text-[#ff6b6b]">
                <p className="font-bold mb-1">⚠️ No suggestions found</p>
                <p className="text-[#999]">
                  Possible causes:
                  <br />• Wrong project selected
                  <br />• RLS blocking access
                  <br />• No AI advice generated yet
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DebugRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-[#2a2a2a]">
      <span className="text-[#999]">{label}:</span>
      <span className={`text-white truncate ${highlight ? 'text-[#ff6b6b] font-bold' : ''}`}>
        {value}
      </span>
    </div>
  );
}

