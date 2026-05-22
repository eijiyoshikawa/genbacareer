export default function CompanyDashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-48 animate-pulse bg-gray-200" />
        <div className="mt-2 h-4 w-80 animate-pulse bg-gray-100" />
      </div>

      {/* 4 KPI カード */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border bg-white p-5 shadow-sm">
            <div className="h-3 w-20 animate-pulse bg-gray-200" />
            <div className="mt-2 h-6 w-16 animate-pulse bg-gray-200" />
            <div className="mt-1 h-3 w-24 animate-pulse bg-gray-100" />
          </div>
        ))}
      </div>

      {/* チャート x 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border bg-white p-5 shadow-sm">
            <div className="h-5 w-32 animate-pulse bg-gray-200" />
            <div className="mt-4 h-48 w-full animate-pulse bg-gray-100" />
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="border bg-white shadow-sm">
        <div className="border-b px-5 py-3">
          <div className="h-5 w-32 animate-pulse bg-gray-200" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3">
              <div className="h-4 w-1/2 animate-pulse bg-gray-100" />
              <div className="mt-2 h-3 w-1/3 animate-pulse bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
