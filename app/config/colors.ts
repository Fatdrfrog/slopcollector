/**
 * SlopCollector Color Palette
 * Dark, trashy, toxic theme for raccoon database cleaning
 */

export const colors = {
  // Backgrounds - Dark trash theme
  bg: {
    primary: '#1a1a1a',      // Main dark background
    secondary: '#2a2a2a',    // Cards, panels
    tertiary: '#0f0f0f',     // Darker sections
    elevated: '#3a3a3a',     // Hover states, borders
  },
  
  // Brand - Toxic green (raccoon)
  brand: {
    primary: '#7ed321',      // Main brand color
    hover: '#6bc916',        // Hover state
    muted: '#5fa80f',        // Disabled state
  },
  
  // Accent colors - Trash palette
  accent: {
    red: '#ff6b6b',          // Errors, destructive
    cyan: '#4ecdc4',         // Info, links
    yellow: '#f7b731',       // Warnings
    purple: '#9b59b6',       // Secondary actions
  },
  
  // Text
  text: {
    primary: '#ffffff',      // Main text
    secondary: '#cccccc',    // Labels
    muted: '#999999',        // Hints
    subtle: '#666666',       // Placeholders
  },
} as const;

