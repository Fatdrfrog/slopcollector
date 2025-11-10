'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}

/**
 * Password input with show/hide toggle
 * Keyboard shortcut: Ctrl/Cmd + K to toggle visibility
 */
export function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  disabled = false,
  autoComplete = 'current-password',
  className = '',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative group">
      <Input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        onKeyDown={(e) => {
          // Toggle visibility with Ctrl/Cmd + K
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setShowPassword(!showPassword);
          }
        }}
        className={`pr-10 ${className}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        tabIndex={-1}
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent opacity-60 hover:opacity-100 transition-opacity"
        onClick={() => setShowPassword(!showPassword)}
        disabled={disabled}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-[#999] group-hover:text-white transition-colors" />
        ) : (
          <Eye className="h-4 w-4 text-[#999] group-hover:text-white transition-colors" />
        )}
        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
      </Button>
    </div>
  );
}

