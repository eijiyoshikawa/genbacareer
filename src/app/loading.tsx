import { Skeleton, JobCardSkeletonGrid } from "@/components/ui/skeleton"

/**
 * グローバル loading.tsx — ルート遷移中に表示される。
 * 各ルートが個別の loading.tsx を持つ場合はそちらが優先される。
 */
export default function RootLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="mt-8">
        <JobCardSkeletonGrid count={6} cols="sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    </div>
  )
}
