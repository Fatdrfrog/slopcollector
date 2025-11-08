'use client';

import { LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface DockIconProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
  delay?: number;
}

export function DockIcon({ icon: Icon, label, onClick, primary = false, delay = 0 }: DockIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative group"
      style={{ 
        animation: `slideUp 0.5s ease-out ${delay}s both`,
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes bounce-hover {
          0%, 100% {
            transform: translateY(0) scale(1.15);
          }
          50% {
            transform: translateY(-8px) scale(1.15);
          }
        }
      `}</style>
      
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative w-16 h-16 rounded-[22%] transition-all duration-200
          ${primary 
            ? 'bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 hover:from-orange-400 hover:via-pink-400 hover:to-purple-500' 
            : 'bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-100 hover:to-gray-200'
          }
          shadow-lg hover:shadow-2xl
          ${isHovered ? 'animate-bounce-hover' : ''}
        `}
        style={{
          animation: isHovered ? 'bounce-hover 0.6s ease-in-out infinite' : undefined,
        }}
      >
        <Icon className={`w-7 h-7 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
          primary ? 'text-white' : 'text-gray-700'
        }`} />
        
        {/* Glossy effect like macOS */}
        <div className="absolute inset-0 rounded-[22%] bg-gradient-to-b from-white/40 to-transparent opacity-60" />
      </button>

      {/* Label tooltip */}
      <div className={`
        absolute -top-12 left-1/2 transform -translate-x-1/2 
        bg-gray-900/95 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg
        whitespace-nowrap pointer-events-none transition-all duration-200
        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
        {label}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45" />
      </div>
    </div>
  );
}
