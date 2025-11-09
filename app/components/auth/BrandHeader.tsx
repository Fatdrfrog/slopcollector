import { Database } from 'lucide-react';

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

/**
 * Singleton pattern: Reusable brand header component
 * DRY: Single source of truth for branding
 */
export function BrandHeader({ 
  title = 'SlopCollector', 
  subtitle,
  showLogo = true 
}: BrandHeaderProps) {
  return (
    <div className="text-center mb-8">
      {showLogo && (
        <div className="inline-flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-[#2a2a2a] border-2 border-[#7ed321] rounded-lg shadow-lg flex items-center justify-center">
            <Database className="w-8 h-8 text-[#7ed321]" />
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold font-mono text-[#7ed321] mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[#999] font-mono text-sm">{subtitle}</p>
      )}
    </div>
  );
}
