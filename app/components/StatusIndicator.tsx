'use client';

import { motion } from 'motion/react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

interface StatusIndicatorProps {
  type: 'success' | 'error' | 'loading';
  message: string;
  onDismiss?: () => void;
}

export function StatusIndicator({ type, message, onDismiss }: StatusIndicatorProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-[#7ed321]/10',
      border: 'border-[#7ed321]',
      text: 'text-[#7ed321]',
    },
    error: {
      icon: XCircle,
      bg: 'bg-[#ff6b6b]/10',
      border: 'border-[#ff6b6b]',
      text: 'text-[#ff6b6b]',
    },
    loading: {
      icon: Loader2,
      bg: 'bg-[#4ecdc4]/10',
      border: 'border-[#4ecdc4]',
      text: 'text-[#4ecdc4]',
    },
  };

  const { icon: Icon, bg, border, text } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed bottom-20 right-6 z-50 ${bg} ${border} border rounded-lg px-4 py-3 font-mono text-sm shadow-lg max-w-md`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${text} ${type === 'loading' ? 'animate-spin' : ''}`} />
        <span className={`${text} flex-1`}>{message}</span>
        {onDismiss && type !== 'loading' && (
          <button
            onClick={onDismiss}
            className={`${text} opacity-60 hover:opacity-100 transition-opacity`}
          >
            ×
          </button>
        )}
      </div>
    </motion.div>
  );
}

