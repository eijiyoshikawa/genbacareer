import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // アイコンライブラリ (lucide-react / @phosphor-icons/react) の named import を
  // ビルド時に individual imports へ変換し、未使用アイコンをバンドルから完全除去する。
  // 数百 KB 単位の JS 削減につながり、初期ロードの「未使用 JS」を縮める。
  experimental: {
    optimizePackageImports: ["lucide-react", "@phosphor-icons/react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Supabase Storage（記事サムネ等）
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // picsum.photos: 記事サムネのプレースホルダー（dev / seed データで使用）
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
    // AVIF を優先（同等の見た目で WebP より 30% 程度小さい）。
    // 古いブラウザは WebP に自動フォールバックする。q や w は変更しないので
    // ロスレス改善 — 視覚品質はそのままにファイルサイズだけ縮む。
    formats: ["image/avif", "image/webp"],
    // 最適化後の画像を 7 日キャッシュ（Vercel エッジ）。
    // ソース URL に q/w が含まれているため再 fetch リスクは低い。
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  /**
   * セキュリティヘッダ。全ページに適用。
   *
   * - Strict-Transport-Security: HTTPS 強制（preload 申請可）
   * - X-Frame-Options: clickjacking 防止
   * - X-Content-Type-Options: MIME sniffing 防止
   * - Referrer-Policy: 外部遷移時の URL リーク制限
   * - Permissions-Policy: 不要な強力 API を全 deny
   * - Content-Security-Policy: スクリプト供給元を許可リスト方式で制限
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      // GA / Sentry / Vercel Analytics + Next.js 必須 inline
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.sentry.io https://va.vercel-scripts.com",
      "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.sentry.io https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https://www.youtube.com https://player.vimeo.com",
      "connect-src 'self' https://*.supabase.co https://*.sentry.io https://www.google-analytics.com https://va.vercel-scripts.com wss://*.supabase.co https://info.gbiz.go.jp",
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.tiktok.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ")

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "autoplay=(self)",
              "battery=()",
              "camera=()",
              "display-capture=()",
              "encrypted-media=()",
              "fullscreen=(self)",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "microphone=()",
              "midi=()",
              "payment=(self)",
              "picture-in-picture=()",
              "publickey-credentials-get=()",
              "screen-wake-lock=()",
              "sync-xhr=()",
              "usb=()",
              "xr-spatial-tracking=()",
            ].join(", "),
          },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ]
  },
};

// SENTRY_DSN が未設定なら sentry config は完全に no-op で動作する
// authToken 未設定時は source maps アップロードがスキップされ警告のみ
// ANALYZE=true で実行すると .next/analyze にバンドル可視化 HTML が出力される
// 例: pnpm analyze
export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
