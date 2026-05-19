"use client"

import Script from "next/script"
import { useSyncExternalStore } from "react"
import { Analytics as VercelAnalytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

function useConsent(): boolean {
  return useSyncExternalStore<boolean>(
    (cb) => {
      window.addEventListener("storage", cb)
      window.addEventListener("cookie-consent-changed", cb)
      return () => {
        window.removeEventListener("storage", cb)
        window.removeEventListener("cookie-consent-changed", cb)
      }
    },
    () => {
      try {
        return localStorage.getItem("cookie_consent") === "all"
      } catch {
        return false
      }
    },
    () => false
  )
}

/**
 * GA4 ローダー。Cookie 同意バナーで "all" を選択された場合のみスクリプトを読み込む。
 * GDPR / 改正電気通信事業法（2023.6〜）の同意要件に準拠。
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const consented = useConsent()

  if (!gaId || !consented) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  )
}

/**
 * Vercel Analytics + SpeedInsights を同意後にだけマウントする。
 * 同意前はクライアント JS が走らないため、PageSpeed のような cookie 非対応 bot では
 * 完全に空 = メインスレッドタスクと未使用 JS が削減される。
 */
export function DeferredVercelTelemetry() {
  const consented = useConsent()
  if (!consented) return null
  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
    </>
  )
}
