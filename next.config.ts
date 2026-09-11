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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.sentry.io https://va.vercel-scripts.com https://maps.googleapis.com",
      "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.sentry.io https://va.vercel-scripts.com https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https://www.youtube.com https://player.vimeo.com",
      // /jobs/map の都道府県ヒートマップが動的 <script> で読み込む Google Maps
      // JavaScript API。ロード後は maps.googleapis.com へ XHR も行うため connect-src
      // にも必要（無いと "Google Maps の読み込みに失敗しました" になる）。
      // https://api.line.me / https://access.line.me は /liff/apply/[id] の
      // @line/liff SDK (liff.init / getProfile / getAccessToken 等) が内部で
      // 呼ぶ LINE 側 API。これが無いとブラウザ外で開いた「LINE で応募」導線が
      // CSP に阻まれて liff.init() が失敗し、常にエラー画面になっていた。
      "connect-src 'self' https://*.supabase.co https://*.sentry.io https://www.google-analytics.com https://va.vercel-scripts.com wss://*.supabase.co https://info.gbiz.go.jp https://maps.googleapis.com https://api.line.me https://access.line.me",
      // 求人詳細ページの地図埋め込み (map-embed.tsx) が maps.google.com の iframe
      // (output=embed) を使うため必須。無いと住所ありの全求人詳細で地図が
      // 表示されない。https://liff.line.me / https://access.line.me は
      // LIFF のログイン/認可フローが内部で開く iframe に必要
      // （connect-src と同じ理由）。
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.tiktok.com https://maps.google.com https://liff.line.me https://access.line.me",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // 明示しないと script-src (unsafe-inline/unsafe-eval 込み) にフォール
      // バックしてしまうため、Service Worker は使っていない前提で明示的に絞る。
      "worker-src 'self'",
      // CSP 違反 (実際に XSS がブロックされた場合等) を検知できるよう、
      // ブラウザからの違反レポート送信先を指定する。以前は report-uri/
      // report-to のどちらも無く、CSP がブロックしても何のシグナルも
      // 残らなかった。
      "report-uri /api/csp-report",
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
