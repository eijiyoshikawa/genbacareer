export default function AdminCompaniesLoading() {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-7 w-32 animate-pulse bg-gray-200" />
          <div className="mt-2 h-4 w-48 animate-pulse bg-gray-100" />
        </div>
        <div className="h-9 w-32 animate-pulse bg-gray-200" />
      </div>

      <div className="mt-4 flex gap-1 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse bg-gray-100" />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <div className="h-9 max-w-sm flex-1 animate-pulse bg-gray-100" />
        <div className="h-9 w-20 animate-pulse bg-gray-200" />
      </div>

      <div className="mt-4 border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="h-4 w-32 animate-pulse bg-gray-200" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-t px-4 py-3">
            <div className="h-4 w-1/3 animate-pulse bg-gray-100" />
            <div className="mt-2 h-3 w-1/4 animate-pulse bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
