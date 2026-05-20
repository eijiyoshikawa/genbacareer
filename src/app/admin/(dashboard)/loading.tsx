/**
 * /admin 配下のページ遷移時に即時表示されるスケルトン。
 *
 * Next.js App Router の loading.tsx は該当 segment の page.tsx が
 * await している間、自動的にこの UI を表示する。クリック → 真っ白な
 * 間が無くなり、体感速度が向上する。
 */

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-56 animate-pulse bg-gray-200" />
        <div className="mt-2 h-4 w-80 animate-pulse bg-gray-100" />
      </div>

      {/* 要対応タスク (4 枚カード) */}
      <section>
        <div className="h-5 w-40 animate-pulse bg-gray-200" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkelCard key={i} />
          ))}
        </div>
      </section>

      {/* 運営サマリー */}
      <section>
        <div className="h-5 w-32 animate-pulse bg-gray-200" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkelCard key={i} />
          ))}
        </div>
      </section>

      {/* 大きい box (チャートや表) */}
      <div className="border bg-white p-5 shadow-sm">
        <div className="h-5 w-32 animate-pulse bg-gray-200" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkelRow key={i} />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-5 w-full animate-pulse bg-gray-100" />
          <div className="h-5 w-2/3 animate-pulse bg-gray-100" />
        </div>
      </div>

      {/* テーブル */}
      <div className="border bg-white shadow-sm">
        <div className="border-b px-5 py-3">
          <div className="h-5 w-48 animate-pulse bg-gray-200" />
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

      {/* 2 列 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border bg-white shadow-sm">
            <div className="border-b px-5 py-3">
              <div className="h-5 w-32 animate-pulse bg-gray-200" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="px-5 py-3">
                  <div className="h-4 w-2/3 animate-pulse bg-gray-100" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkelCard() {
  return (
    <div className="border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 animate-pulse bg-gray-200" />
        <div className="h-5 w-5 animate-pulse bg-gray-100" />
      </div>
      <div className="mt-2 h-8 w-16 animate-pulse bg-gray-200" />
      <div className="mt-2 h-3 w-24 animate-pulse bg-gray-100" />
    </div>
  )
}

function SkelRow() {
  return (
    <div className="pl-3">
      <div className="h-3 w-20 animate-pulse bg-gray-200" />
      <div className="mt-1 h-7 w-24 animate-pulse bg-gray-200" />
    </div>
  )
}
