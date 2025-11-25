'use client';

import { motion } from 'motion/react';
import { useEffect } from 'react';
import { videoUrls } from '@/lib/supabase/storage';


export function RaccoonWelcome({ onComplete }: { onComplete: () => void }) {


  useEffect(() => {
    const fallback = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(fallback);
  }, [onComplete]);

  const handleVideoEnd = () => {
    setTimeout(onComplete, 500); 
  };

  return (
    <motion.div
      className="h-screen w-screen flex items-center justify-center bg-[#1a1a1a]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="max-w-2xl w-full px-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <video
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnd}
          onError={(e) => {
            console.error('Hi video failed to load:', e);
            handleVideoEnd();
          }}
          className="w-full h-auto rounded-lg"
        >
          <source src={videoUrls.hi()} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <motion.p
          className="text-center text-[#7ed321] font-mono text-lg mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Welcome to SlopCollector 🦝
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

