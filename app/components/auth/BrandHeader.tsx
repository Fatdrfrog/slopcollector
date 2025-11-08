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
          <div className="w-16 h-16 bg-linear-to-br from-orange-500 via-pink-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center">
            <Database className="w-8 h-8 text-white" />
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold bg-linear-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-gray-600">{subtitle}</p>
      )}
    </div>
  );
}

