import Link from "next/link"
import { CirclePlay, Camera } from "lucide-react"
import { BrandLogo } from "./brand-logo"
import { LinkButton } from "@/components/ui/button"
import { FooterSeoHub } from "./footer-seo-hub"

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-stone-900 text-gray-300">
      {/* SEO ハブ: 47 都道府県 × 職種の内部リンク (details で折り畳み、 default は閉) */}
      <FooterSeoHub />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <Link href="/" aria-label="ゲンバキャリア トップへ">
              <BrandLogo variant="dark" />
            </Link>
            <p className="mt-3 text-xs text-gray-400 max-w-xs leading-relaxed">
              現場で働く方のための求人サービス。
              建築・土木・設備・解体に特化、20〜30 代の若手も活躍中。
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <LinkButton
              href="/register/wizard"
              variant="primary"
              size="md"
              className="bg-primary-500 hover:bg-primary-600"
            >
              会員登録（無料）
            </LinkButton>
            <LinkButton
              href="/contact"
              variant="secondary"
              size="md"
              prefetch={false}
              className="border-gray-500 bg-transparent text-gray-300 hover:bg-stone-800 hover:text-white"
            >
              ヘルプ・お問い合わせ
            </LinkButton>
          </div>
        </div>

        {/* Links — フッターは常時可視のため、主要 CTA 以外は prefetch を無効化して
            初回バンドルとアイドル時のネットワーク使用量を抑える */}
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-white">求職者の方へ</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/jobs" className="text-xs text-gray-400 hover:text-primary-300 transition">求人検索</Link></li>
              <li><Link href="/register/wizard" className="text-xs text-gray-400 hover:text-primary-300 transition">会員登録</Link></li>
              <li><Link href="/login" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">ログイン</Link></li>
              <li><Link href="/faq" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">よくある質問</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">企業の方へ</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/for-employers" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">掲載について</Link></li>
              <li><Link href="/company/register" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">企業登録</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">コンテンツ</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/journal" className="text-xs text-gray-400 hover:text-primary-300 transition">マガジン</Link></li>
              <li><Link href="/authors" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">編集部・著者紹介</Link></li>
              <li><Link href="/editorial-policy" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">編集ポリシー</Link></li>
              <li><Link href="/about" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">サイトについて</Link></li>
              <li><Link href="/terms" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">利用規約</Link></li>
              <li><Link href="/privacy" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">プライバシーポリシー</Link></li>
              <li><Link href="/legal" prefetch={false} className="text-xs text-gray-400 hover:text-primary-300 transition">特定商取引法に基づく表記</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">運営会社</h3>
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              <p>株式会社LET</p>
              <p>大阪府大阪市中央区南久宝寺町</p>
              <p>4-4-12 IB CENTERビル8F</p>
              <p>TEL: 06-6786-8320</p>
              <p className="mt-2 text-gray-400">有料職業紹介事業</p>
              <p>許可番号: 27-ユ-304693</p>
            </div>
          </div>
        </div>

        {/* SNS + Bottom */}
        <div className="mt-8 border-t border-stone-700 pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">公式SNS</span>
              <a
                href="https://youtube.com/@let-kensetsu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center bg-stone-700 text-gray-300 hover:bg-red-600 hover:text-white transition"
                aria-label="YouTube"
              >
                <CirclePlay className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/let_kensetsu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center bg-stone-700 text-gray-300 hover:bg-pink-600 hover:text-white transition"
                aria-label="Instagram"
              >
                <Camera className="h-5 w-5" />
              </a>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs text-gray-400">
                有料職業紹介事業許可番号 27-ユ-304693
              </p>
              <p className="mt-1 text-xs text-gray-500">
                &copy; {new Date().getFullYear()} ゲンバキャリア. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
