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
        <span className="text-muted-foreground">Password strength:</span>
        <span className={cn(
          'font-medium',
          strength.score < 30 && 'text-red-600',
          strength.score >= 30 && strength.score < 60 && 'text-orange-600',
          strength.score >= 60 && strength.score < 80 && 'text-yellow-600',
          strength.score >= 80 && 'text-green-600'
        )}>
          {strength.label}
        </span>
      </div>
      <Progress 
        value={strength.score} 
        className="h-2"
        indicatorClassName={strength.color}
      />
      {strength.score < 60 && (
        <p className="text-xs text-muted-foreground">
          {strength.score < 30 
            ? 'Try a longer password with numbers and symbols'
            : 'Add uppercase letters and symbols for better security'
          }
        </p>
      )}
    </div>
  );
}

