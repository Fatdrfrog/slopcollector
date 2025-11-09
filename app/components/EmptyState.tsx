'use client';

import { motion } from 'motion/react';
import { Database, RefreshCw, Zap } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  onSync: () => void;
  isSyncing: boolean;
}

export function EmptyState({ onSync, isSyncing }: EmptyStateProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-[#0f0f0f]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md px-6"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#2a2a2a] border-2 border-[#3a3a3a]"
        >
          <Database className="w-10 h-10 text-[#7ed321]" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-mono font-bold text-white mb-3"
        >
          No Schema Data Yet
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-[#999] font-mono mb-6 leading-relaxed"
        >
          Your database schema will appear here. Click sync to fetch tables, columns, and relationships from your Supabase project.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <Button
            onClick={onSync}
            disabled={isSyncing}
            className="bg-[#7ed321] hover:bg-[#6bc916] text-black font-mono font-bold"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing Schema...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Database Schema
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-[#3a3a3a]">
            <p className="text-xs text-[#666] font-mono mb-3">What you'll see:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#999] font-mono">
                <Zap className="w-3 h-3 text-[#4ecdc4]" />
                <span>ERD diagram with all tables</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#999] font-mono">
                <Zap className="w-3 h-3 text-[#4ecdc4]" />
                <span>Column details and types</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#999] font-mono">
                <Zap className="w-3 h-3 text-[#4ecdc4]" />
                <span>Foreign key relationships</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

