import { cn } from "@/lib/utils"

/**
 * 共通 Skeleton プリミティブ。背景は warm-50、Tailwind の animate-pulse で
 * ロード中の視覚的フィードバックを与える。
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse bg-warm-200/60", className)}
      {...props}
    />
  )
}

/** 求人カード 1 枚分の skeleton（高さ JobCard 相当） */
export function JobCardSkeleton() {
  return (
    <div className="border bg-white p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
}

/** 求人カードのグリッド (n 枚) */
export function JobCardSkeletonGrid({
  count = 6,
  cols = "sm:grid-cols-2",
}: {
  count?: number
  cols?: string
}) {
  return (
    <div className={cn("grid gap-4", cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** ページタイトル + リード文の skeleton */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

/** 縦並びリスト行 (アバター + テキスト 2 行) */
export function ListRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="divide-y border bg-white">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}
