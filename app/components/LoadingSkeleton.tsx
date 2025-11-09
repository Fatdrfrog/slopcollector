import { Skeleton } from '@/components/ui/skeleton';

export function TableNodeSkeleton() {
  return (
    <div className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg p-4 w-64">
      <Skeleton className="h-6 w-32 mb-4 bg-[#3a3a3a]" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded bg-[#3a3a3a]" />
            <Skeleton className="h-4 flex-1 bg-[#3a3a3a]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SuggestionsSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl p-4">
          <Skeleton className="h-5 w-48 mb-2 bg-[#3a3a3a]" />
          <Skeleton className="h-4 w-full mb-1 bg-[#3a3a3a]" />
          <Skeleton className="h-4 w-3/4 bg-[#3a3a3a]" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="h-screen w-screen flex">
      <div className="flex-1 p-8 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <TableNodeSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="w-[420px] border-l border-gray-800 p-4">
        <SuggestionsSkeleton />
      </div>
    </div>
  );
}

