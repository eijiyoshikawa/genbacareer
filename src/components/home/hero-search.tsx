import Image from "next/image"
import Link from "next/link"
import { Search, MapPin, Briefcase, SlidersHorizontal } from "lucide-react"
import { PREFECTURES } from "@/lib/constants"
import { CATEGORIES } from "@/lib/categories"

/**
 * トップページ Hero（クロスワーク型）。
 *
 * - 建設現場の写真ストリップを背景に敷き、中央に検索パネルを重ねる
 * - パネル内に「職種 × 勤務地 + 求人検索」を内蔵（<form action="/jobs"> の GET 送信）
 * - サーバー Component（state なし）で hydration コストゼロ
 *
 * 色はゲンバキャリアの既存ブランド（オレンジ/イエロー）を維持し、
 * レイアウト・構成のみクロスワーク風に寄せている。
 *
 * 注: 背景写真は本番で表示実績のある Unsplash ID のみを使用（画像割れ防止）。
 */

// 背景の写真ストリップ（左から: ドライバー / 建設現場 / 作業員 / 施工管理）
const STRIP_IMAGES: ReadonlyArray<{ src: string; alt: string }> = [
  {
    src: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=70",
    alt: "",
  },
  {
    src: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=70",
    alt: "",
  },
  {
    src: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=70",
    alt: "",
  },
  {
    src: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=70",
    alt: "",
  },
]

export function HeroSearch({ totalJobs }: { totalJobs?: number }) {
  return (
    <section className="relative overflow-hidden bg-ink-900">
      {/* 背景: 写真ストリップ */}
      <div aria-hidden className="absolute inset-0 grid grid-cols-2 lg:grid-cols-4">
        {STRIP_IMAGES.map((img, i) => (
          <div key={img.src} className="relative">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {/* 可読性確保のオーバーレイ */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/45 to-ink-900/65"
      />

      {/* 中央パネル */}
      <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="bg-ink-900/70 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur-md sm:p-7">
          {/* タイトル */}
          <h1 className="text-center text-3xl font-black tracking-tight text-white sm:text-4xl">
            ゲンバ<span className="text-brand-yellow-400">キャリア</span>
          </h1>
          <p className="mt-2 text-center text-sm font-bold text-white/90 sm:text-base">
            建設業界に特化した求人サイト
          </p>
          <p className="mt-1 text-center text-xs text-white/70 sm:text-sm">
            建築・躯体／土木／電気・設備／内装／解体／施工管理／測量設計／ドライバー・重機
          </p>

          {/* 検索フォーム */}
          <form action="/jobs" role="search" className="mt-5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-stretch">
              {/* 職種 */}
              <label className="flex items-center gap-2 bg-white px-3 py-2.5 shadow-sm">
                <Briefcase className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
                <span className="sr-only">職種</span>
                <select
                  name="category"
                  defaultValue=""
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
                >
                  <option value="">職種を選ぶ</option>
                  {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* 勤務地 */}
              <label className="flex items-center gap-2 bg-white px-3 py-2.5 shadow-sm">
                <MapPin className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
                <span className="sr-only">勤務地</span>
                <select
                  name="prefecture"
                  defaultValue=""
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
                >
                  <option value="">勤務地を選ぶ</option>
                  {PREFECTURES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              {/* 求人検索ボタン */}
              <button
                type="submit"
                className="press btn-brand-gradient inline-flex h-11 items-center justify-center gap-1.5 px-6 text-sm font-extrabold shadow sm:h-auto"
              >
                <Search className="h-4 w-4" aria-hidden />
                求人検索
              </button>
            </div>

            {/* 詳細検索 + 掲載件数 */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1 text-xs font-bold text-white/90 underline-offset-2 hover:text-brand-yellow-300 hover:underline"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                詳細を指定して探す
              </Link>
              {totalJobs != null && totalJobs > 0 && (
                <span className="text-xs text-white/80">
                  掲載求人数{" "}
                  <span className="mx-0.5 text-base font-extrabold text-brand-yellow-300">
                    {totalJobs.toLocaleString()}
                  </span>
                  件
                </span>
              )}
            </div>
          </form>

          {/* 人気キーワード */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {[
              { label: "未経験OK", q: "未経験" },
              { label: "資格取得支援", q: "資格" },
              { label: "寮あり", q: "寮" },
              { label: "週休2日", q: "週休2日" },
              { label: "高収入", q: "高収入" },
            ].map((c) => (
              <a
                key={c.q}
                href={`/jobs?q=${encodeURIComponent(c.q)}`}
                className="press inline-flex items-center bg-white/15 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/25"
              >
                #{c.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
