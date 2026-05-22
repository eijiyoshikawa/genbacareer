import {
  Skeleton,
  JobCardSkeletonGrid,
} from "@/components/ui/skeleton"

export default function JobsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* タイトル */}
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* 検索バー風 skeleton */}
      <div className="mt-6 grid gap-3 border bg-white p-4 sm:grid-cols-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>

      {/* 求人カードグリッド */}
      <div className="mt-6">
        <JobCardSkeletonGrid count={10} cols="sm:grid-cols-2" />
      </div>
    </div>
  )
}
