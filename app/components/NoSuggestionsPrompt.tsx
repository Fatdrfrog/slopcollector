'use client';

import { motion } from 'motion/react';
import { Sparkles, Zap } from 'lucide-react';

interface NoSuggestionsPromptProps {
  onGenerateAdvice: () => void;
  isGenerating: boolean;
  hasGeneratedBefore: boolean;
}

/**
 * Prompt shown when no suggestions exist
 * Encourages users to run AI advice
 */
export function NoSuggestionsPrompt({
  onGenerateAdvice,
  isGenerating,
  hasGeneratedBefore,
}: NoSuggestionsPromptProps) {
  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="text-center max-w-sm">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7ed321]/30 to-[#4ecdc4]/30 rounded-full animate-pulse" />
            <div className="relative w-full h-full bg-[#2a2a2a] rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[#7ed321] animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-2 font-mono">
            GPT-5 Analyzing Schema...
          </h3>
          <p className="text-sm text-[#999]">
            Examining {hasGeneratedBefore ? 'updated' : 'your'} database structure for optimization opportunities
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex items-center justify-center p-8"
    >
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-[#7ed321]/20 to-[#4ecdc4]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[#7ed321]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 font-mono">
          {hasGeneratedBefore ? 'No Active Suggestions' : 'Ready for AI Analysis'}
        </h3>
        <p className="text-sm text-[#ccc] mb-6">
          {hasGeneratedBefore
            ? 'Your schema looks optimized! Run AI advice again to check for new opportunities.'
            : 'Let AI analyze your database schema and suggest optimizations.'}
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-[#999] bg-[#2a2a2a] rounded-lg p-3">
            <Zap className="w-4 h-4 text-[#4ecdc4]" />
            <span>Detects missing indexes on foreign keys</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#999] bg-[#2a2a2a] rounded-lg p-3">
            <Zap className="w-4 h-4 text-[#4ecdc4]" />
            <span>Identifies slow query patterns</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#999] bg-[#2a2a2a] rounded-lg p-3">
            <Zap className="w-4 h-4 text-[#4ecdc4]" />
            <span>Suggests composite indexes</span>
          </div>
        </div>

        <button
          onClick={onGenerateAdvice}
          className="inline-flex items-center gap-2 bg-[#7ed321] hover:bg-[#6bc916] text-black font-bold py-3 px-6 rounded-md transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate AI Recommendations
        </button>
        
        <p className="text-xs text-gray-600 mt-4">
          Keyboard shortcut: <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">⌘G</kbd>
        </p>
      </div>
    </motion.div>
  );
}

