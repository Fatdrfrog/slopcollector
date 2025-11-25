'use client';

import { ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/app/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';
import { useState } from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-destructive">Something went wrong</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            </div>

            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                  <ChevronDown
                    className={`mr-1 h-3 w-3 transition-transform ${
                      showDetails ? 'rotate-180' : ''
                    }`}
                  />
                  {showDetails ? 'Hide' : 'Show'} details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <pre className="max-h-[200px] overflow-auto rounded bg-muted p-3 text-xs">
                  <code>{error.stack}</code>
                </pre>
              </CollapsibleContent>
            </Collapsible>

            <Button onClick={resetErrorBoundary} size="sm" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  onReset?: () => void;
}

/**
 * Enhanced error boundary with better UX
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundaryWrapper>
 *   <YourComponent />
 * </ErrorBoundaryWrapper>
 * ```
 */
export function ErrorBoundaryWrapper({ children, onReset }: ErrorBoundaryWrapperProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={onReset}
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
