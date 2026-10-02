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
  toJsonLdScript,
} from "@/lib/structured-data";
import { ensureSchema } from "@/lib/ensure-schema";
import "./globals.css";

// ブランドフォント: Noto Sans JP（日本の求人サイトで定番。ニュートラルで高い可読性）。
// 日本語ウェブフォントは大きいため preload:false で初期表示をブロックしない。
// 取得前/失敗時はシステムゴシック (Hiragino / Yu Gothic) にフォールバック。
const brandGothic = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  preload: false,
  variable: "--font-gothic",
});

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ゲンバキャリア | 建設業界特化型求人サイト",
    template: "%s | ゲンバキャリア",
  },
  description:
    "建築・土木・電気・内装・解体・ドライバー・施工管理・測量の求人を掲載する建設業界特化型求人サイト。全国 47 都道府県・8 職種で検索可能。LINE で気軽に応募、採用決定でお祝い金がもらえます。株式会社 LET 運営。",
  keywords: [
    "建設業 求人",
    "建築 求人",
    "土木 求人",
    "電気工事 求人",
    "内装 求人",
    "施工管理 求人",
    "解体 求人",
    "測量 求人",
    "ドライバー 求人",
    "建設 転職",
    "未経験 建設",
    "資格取得支援",
    "ゲンバキャリア",
  ],
  authors: [{ name: "ゲンバキャリア編集部", url: `${siteUrl}/about` }],
  creator: "株式会社 LET",
  publisher: "株式会社 LET",
  applicationName: "ゲンバキャリア",
  category: "建設業界 求人",
  formatDetection: { telephone: false, address: false, email: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "ゲンバキャリア",
    title: "ゲンバキャリア | 建設業界特化型求人サイト",
    description:
      "建築・土木・電気・内装・解体・ドライバー・施工管理・測量。全国 47 都道府県の建設業求人を網羅。LINE で気軽に応募・採用決定でお祝い金。",
    url: siteUrl,
    images: [
      {
        url: "/logo.png",
        width: 1000,
        height: 1000,
        alt: "ゲンバキャリア | 建設業界特化型求人サイト",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@genbacareer",
    creator: "@genbacareer",
    title: "ゲンバキャリア | 建設業界特化型求人サイト",
    description: "建築・土木・電気・内装の求人を網羅。LINE で気軽に応募。",
    images: [
      {
        url: "/logo.png",
        width: 1000,
        height: 1000,
        alt: "ゲンバキャリア | 建設業界特化型求人サイト",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
  // /logo.png (1000x1000・透過) を全アイコン用途に統一。
  // - ブラウザタブ favicon (icon)
  // - iOS ホーム画面 (apple)
  // - 検索結果 / SNS の OG 画像は openGraph.images で指定済み
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
    shortcut: ["/logo.png"],
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
    <html lang="ja" className={`h-full antialiased ${brandGothic.variable}`}>
      <head>
        {/* 画像 CDN へ TLS ハンドシェイクを先回り。LCP 候補のヒーロー画像が
            初回ロードで 100〜300ms 早く到達する（視覚品質は変わらない） */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* RSS フィード自動検出 — Feedly / NetNewsWire 等の購読アプリで認識される */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ゲンバキャリア マガジン (RSS)"
          href="/journal/rss.xml"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(siteSchema) }}
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
