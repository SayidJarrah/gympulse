export function TrainerCardSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-32 rounded-full bg-gray-800 animate-pulse" />
            <div className="h-3 w-24 rounded-full bg-gray-800 animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-8 rounded-full bg-gray-800 animate-pulse" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-gray-800 animate-pulse" />
        <div className="h-6 w-20 rounded-full bg-gray-800 animate-pulse" />
        <div className="h-6 w-12 rounded-full bg-gray-800 animate-pulse" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 w-24 rounded-full bg-gray-800 animate-pulse" />
        <div className="h-3 w-16 rounded-full bg-gray-800 animate-pulse" />
      </div>
    </div>
  )
}
