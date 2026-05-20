import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">求職者の方へ</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/jobs" className="text-sm text-gray-600 hover:text-gray-900">
                  求人検索
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-gray-600 hover:text-gray-900">
                  会員登録
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">企業の方へ</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/for-employers" className="text-sm text-gray-600 hover:text-gray-900">
                  掲載について
                </Link>
              </li>
              <li>
                <Link href="/company/register" className="text-sm text-gray-600 hover:text-gray-900">
                  企業登録
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">サイト情報</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">
                  サイトについて
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/legal/tokushoho" className="text-sm text-gray-600 hover:text-gray-900">
                  特定商取引法に基づく表記
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-xs text-gray-500">
          <p>ハローワーク求人はハローワークインターネットサービスより転載しています。</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} 現場キャリア. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
