/**
 * GA4 (gtag) クライアントヘルパー。
 *
 * 既存の <GoogleAnalytics /> コンポーネントが gtag.js をロード済みであることが前提。
 * window.gtag の存在を毎回チェックし、未ロード環境では no-op。
 *
 * 主な用途:
 *  - lead 化時の conversion 計測 (`generate_lead` イベント)
 *  - 各種 CTA クリックのカスタムイベント
 *  - 内部 sessionId と GA client_id の紐付け
 */

type GtagEventParams = Record<string, string | number | boolean | undefined | null>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/** GA イベントを発火。SSR / GA 未ロード環境では何もしない。 */
export function gaEvent(name: string, params: GtagEventParams = {}): void {
  if (typeof window === "undefined") return
  const w = window
  if (typeof w.gtag !== "function") return
  // null / undefined を取り除く
  const clean: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) clean[k] = v
  }
  w.gtag("event", name, clean)
}

/**
 * lead 化イベント（GA4 推奨 conversion）。
 * GA4 dashboard で「主要イベント」として設定すれば Conversion に集計される。
 */
export function gaTrackLead(opts: {
  leadId: string | null
  jobId: string | null
  jobTitle?: string | null
  prefecture?: string | null
  category?: string | null
  /** 想定金額（成約価値）。任意。 */
  valueJpy?: number
}): void {
  gaEvent("generate_lead", {
    currency: "JPY",
    value: opts.valueJpy ?? 498000, // 成果報酬 1 名 49.8 万円〜（職種による）
    lead_id: opts.leadId ?? undefined,
    job_id: opts.jobId ?? undefined,
    job_title: opts.jobTitle ?? undefined,
    prefecture: opts.prefecture ?? undefined,
    category: opts.category ?? undefined,
  })
}

/** 求人詳細ページの「LINE で応募」ボタンクリック計測。 */
export function gaTrackApplyClick(jobId: string, source: string): void {
  gaEvent("apply_click", {
    job_id: jobId,
    source,
  })
}
