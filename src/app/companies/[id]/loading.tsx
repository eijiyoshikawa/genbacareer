import { Skeleton, JobCardSkeletonGrid } from "@/components/ui/skeleton"

export default function CompanyDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 border bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 shrink-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-10">
        <Skeleton className="h-6 w-1/4" />
        <div className="mt-4">
          <JobCardSkeletonGrid count={4} cols="sm:grid-cols-2" />
        </div>
      </div>
    </div>
  )
}
