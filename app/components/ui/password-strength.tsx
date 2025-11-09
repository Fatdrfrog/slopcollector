'use client';

import { useMemo } from 'react';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/app/components/ui/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

/**
 * Password Strength Indicator
 * Provides real-time feedback on password quality
 * Improves UX and security
 */
export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    
    // Complexity checks
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;
    
    // Get label and color based on score
    if (score < 30) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score < 60) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score < 80) return { score, label: 'Good', color: 'bg-yellow-500' };
    return { score: 100, label: 'Strong', color: 'bg-green-500' };
  }, [password]);

  if (!password) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#666] font-mono">Strength:</span>
        <span className={cn(
          'font-mono font-bold',
          strength.score < 30 && 'text-[#ff6b6b]',
          strength.score >= 30 && strength.score < 60 && 'text-[#f7b731]',
          strength.score >= 60 && strength.score < 80 && 'text-[#4ecdc4]',
          strength.score >= 80 && 'text-[#7ed321]'
        )}>
          {strength.label}
        </span>
      </div>
      <Progress 
        value={strength.score} 
        className="h-1.5 bg-[#3a3a3a]"
        indicatorClassName={strength.color}
      />
      {strength.score < 60 && (
        <p className="text-xs text-[#666] font-mono">
          {strength.score < 30 
            ? 'Add numbers & symbols'
            : 'Add uppercase & symbols'
          }
        </p>
      )}
    </div>
  );
}

