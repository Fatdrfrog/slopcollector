/**
 * Theme configuration for the ERD application
 * Centralized color scheme and styling constants
 */

export const colors = {
    // Background colors
    bg: {
      primary: '#0f0f0f',
      secondary: '#1a1a1a',
      tertiary: '#151515',
    },
    
    // Border colors
    border: {
      default: '#262626',
      emphasis: '#404040',
      gray: '#1f1f1f',
    },
    
    // Status colors
    status: {
      selected: '#6366f1', // indigo-500
      warning: '#f59e0b',  // amber-500
      error: '#ef4444',     // red-500
      info: '#3b82f6',      // blue-500
    },
    
    // Text colors
    text: {
      primary: '#f5f5f5',
      secondary: '#d1d5db',
      muted: '#9ca3af',
      disabled: '#6b7280',
    },
  };
  
  export const spacing = {
    card: {
      padding: '1rem',
      gap: '0.75rem',
    },
    node: {
      minWidth: '320px',
    },
  };
  
  export const effects = {
    shadow: {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      '2xl': 'shadow-2xl',
    },
    blur: 'backdrop-blur-sm',
    transition: 'transition-all duration-200',
  };
  