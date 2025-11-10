'use client';

import { useMemo } from 'react';
import { Progress } from '@/app/components/ui/progress';

interface PasswordStrengthProps {
  password: string;
}

type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

interface StrengthResult {
  score: number;
  level: StrengthLevel;
  feedback: string;
  color: string;
}

/**
 * Calculate password strength
 */
function calculateStrength(password: string): StrengthResult {
  if (!password) {
    return { score: 0, level: 'weak', feedback: '', color: '#666666' };
  }

  let score = 0;

  // Length check (max 40 points)
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety (max 40 points)
  if (/[a-z]/.test(password)) score += 10; // lowercase
  if (/[A-Z]/.test(password)) score += 10; // uppercase
  if (/\d/.test(password)) score += 10; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 10; // special chars

  // Complexity patterns (max 20 points)
  if (password.length >= 10 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password) && password.length >= 12) score += 10;

  // Determine level and feedback
  let level: StrengthLevel;
  let feedback: string;
  let color: string;

  if (score < 30) {
    level = 'weak';
    feedback = 'Too weak. Add more characters and variety.';
    color = '#ff6b6b';
  } else if (score < 50) {
    level = 'fair';
    feedback = 'Fair. Try adding special characters.';
    color = '#f7b731';
  } else if (score < 75) {
    level = 'good';
    feedback = 'Good password strength.';
    color = '#4ecdc4';
  } else {
    level = 'strong';
    feedback = 'Strong password!';
    color = '#7ed321';
  }

  return { score, level, feedback, color };
}

/**
 * Visual password strength indicator
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Progress 
        value={strength.score} 
        className="h-2" 
        style={{ 
          '--progress-background': strength.color 
        } as React.CSSProperties}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono" style={{ color: strength.color }}>
          {strength.feedback}
        </p>
        <p className="text-xs font-mono text-[#666]">
          {password.length}/16+ chars
        </p>
      </div>
    </div>
  );
}

