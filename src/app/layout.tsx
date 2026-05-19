import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NavigationProgress } from "@/components/navigation-progress";
import { GoogleAnalytics } from "@/components/analytics";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ゲンバキャリア",
    description: "建築・土木・設備・解体に特化した求人サイト",
    images: ["/opengraph-image"],
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
  await ensureSchema()

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
        <NavigationProgress />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsentBanner />
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
