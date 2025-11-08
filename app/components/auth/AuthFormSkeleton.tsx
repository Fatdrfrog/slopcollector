import { Skeleton } from '@/app/components/ui/skeleton';

/**
 * Auth Form Skeleton Loader
 * DRY: Reusable loading state for auth forms
 * Improves perceived performance
 */
export function AuthFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" /> {/* Label */}
        <Skeleton className="h-10 w-full" /> {/* Input */}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" /> {/* Label */}
        <Skeleton className="h-10 w-full" /> {/* Input */}
      </div>
      <Skeleton className="h-10 w-full" /> {/* Button */}
      <Skeleton className="h-8 w-full" /> {/* Secondary button */}
    </div>
  );
}

