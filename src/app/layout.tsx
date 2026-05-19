import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NavigationProgress } from "@/components/navigation-progress";
import { GoogleAnalytics, DeferredVercelTelemetry } from "@/components/analytics";
import { CookieConsentBanner } from "@/components/cookie-consent";
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
} from "@/lib/structured-data";
import { ensureSchema } from "@/lib/ensure-schema";
import "./globals.css";

// Latin subset のみ。日本語本体はシステムフォント (Hiragino / Yu Gothic) が
// 引き取るため、Noto Sans JP は ASCII (数字・英単語) 用の最小構成。
// 900 (font-black) は利用が少ないため除外し、700 で合成させる。
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-jp",
});

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://genbacareer.jp";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ゲンバキャリア | 建設業界特化型求人サイト",
    template: "%s | ゲンバキャリア",
  },
  description:
    "建築・土木・設備・解体に特化した求人サイト。ハローワーク求人も掲載。株式会社LET運営。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "ゲンバキャリア",
    title: "ゲンバキャリア | 建設業界特化型求人サイト",
    description: "建築・土木・設備・解体に特化した求人サイト。ハローワーク求人も掲載。",
    url: siteUrl,
    images: [{ url: "/logo-demo.jpg" }],
  },
  twitter: {
    card: "summary",
    title: "ゲンバキャリア",
    description: "建築・土木・設備・解体に特化した求人サイト",
    images: ["/logo-demo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? undefined,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ゲンバキャリア",
  },
  // /logo-demo.jpg を全アイコン用途に統一。
  // - ブラウザタブ favicon (icon)
  // - iOS ホーム画面 (apple)
  // - 検索結果 / SNS の OG 画像は openGraph.images で指定済み
  icons: {
    icon: [{ url: "/logo-demo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/logo-demo.jpg" }],
    shortcut: ["/logo-demo.jpg"],
  },
};

// Next.js 16 では themeColor / colorScheme / viewport は viewport export へ
export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 起動時に追加カラム（rank_score / Company SNS など）を冪等に追加。
  // 本番 DB が `prisma db push` 未反映でも 500 を防ぐためのセルフヒーリング。
  // クリティカルパスを塞がないため fire-and-forget。
  // ensureSchema 内部は inflight 変数で memoize されており、複数同時呼び出しでも 1 回だけ実行される。
  // 本番は db push 済みなので通常運用では no-op。
  void ensureSchema()

  // サイト全体に効く Organization + WebSite の構造化データ。
  // Google 検索結果のサイトリンクや「サイト内検索」表示の元となる。
  const orgSchema = generateOrganizationSchema()
  const siteSchema = generateWebSiteSchema()

  return (
    <html lang="ja" className={`h-full antialiased ${notoSansJP.variable}`}>
      <head>
        {/* 画像 CDN へ TLS ハンドシェイクを先回り。LCP 候補のヒーロー画像が
            初回ロードで 100〜300ms 早く到達する（視覚品質は変わらない） */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-white">
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        {/* Skip link — Tab キー押下時のみ表示。
            キーボード/SR ユーザーが Header を飛ばして本文へ直接遷移できる */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-ink-900 focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
        >
          本文へスキップ
        </a>
        <NavigationProgress />
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
        <CookieConsentBanner />
        <DeferredVercelTelemetry />
      </body>
    </html>
  );
}
