import type { MetadataRoute } from "next"

/**
 * PWA Web App Manifest（/manifest.webmanifest として配信される）。
 *
 * - スマホ「ホーム画面に追加」でネイティブ風起動
 * - splash 画面と theme color を制御
 * - icon は src/app/icon.tsx の動的アイコンを参照
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ゲンバキャリア — 建設業特化型 求人サイト",
    short_name: "ゲンバキャリア",
    description:
      "建築・土木・電気・内装の求人を探せる建設業特化型求人サイト。20〜30 代の若手も活躍中、LINE で気軽に応募。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0F766E", // primary-700 相当
    lang: "ja-JP",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "求人を探す",
        short_name: "求人検索",
        url: "/jobs",
      },
      {
        name: "マイページ",
        short_name: "マイページ",
        url: "/mypage",
      },
    ],
  }
}
