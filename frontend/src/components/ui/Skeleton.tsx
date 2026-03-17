import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  const radiusClass = {
    sm:   'rounded',
    md:   'rounded-lg',
    lg:   'rounded-xl',
    full: 'rounded-full',
  }[rounded]

  return <div className={clsx('skeleton', radiusClass, className)} aria-hidden="true" />
}

/** Card grid skeleton — matches DocCard layout */
export function DocCardSkeleton() {
  return (
    <div className="bg-surface-2 rounded-lg border border-border overflow-hidden" aria-hidden="true">
      {/* Cover */}
      <div className="relative">
        <Skeleton className="w-full h-[140px]" rounded="sm" />
        {/* Fake badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Skeleton className="h-4 w-16" rounded="full" />
        </div>
        <div className="absolute top-2 right-2">
          <Skeleton className="h-4 w-10" rounded="full" />
        </div>
      </div>
      {/* Content */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-3.5 w-[70%]" />
        <Skeleton className="h-3 w-[60%]" />
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-5 w-14" rounded="full" />
          <Skeleton className="h-5 w-12" rounded="full" />
          <Skeleton className="h-5 w-16" rounded="full" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" rounded="full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

/** List row skeleton */
export function DocRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2.5" aria-hidden="true">
      <div className="w-1 h-[62px] rounded-full bg-border flex-shrink-0" />
      <Skeleton className="w-[88px] h-[62px] flex-shrink-0" rounded="md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-12" rounded="full" />
          <Skeleton className="h-4 w-10" rounded="full" />
          <Skeleton className="h-4 w-14" rounded="full" />
        </div>
      </div>
      <Skeleton className="h-3 w-20 flex-shrink-0" />
    </div>
  )
}

/** Dashboard stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4 space-y-3" aria-hidden="true">
      <div className="flex items-start justify-between">
        <Skeleton className="h-9 w-9" rounded="lg" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}
