/**
 * 3.4 通知頻度・時間帯設定。
 *
 * User.notificationPrefs (Json) を型安全に読み書きするヘルパー。
 * 既定値は「全チャネル ON / 即時配信 / 静音時間なし」。
 *
 * cron や notification.ts から `isInQuietHours()` を呼んで、配信を
 * 当該時間帯にスキップ / 翌日にずらす判断に使う。
 */

export type NotificationFrequency = "immediate" | "daily" | "weekly"

export interface NotificationPrefs {
  emailEnabled: boolean
  lineEnabled: boolean
  pushEnabled: boolean
  frequency: NotificationFrequency
  /** 静音時間開始 (JST 0-23、null なら無効) */
  quietHoursStart: number | null
  /** 静音時間終了 (JST 0-23、null なら無効) */
  quietHoursEnd: number | null
  /** スカウト受信メール ON/OFF (デフォルト true) */
  scoutEnabled: boolean
}

export const DEFAULT_PREFS: NotificationPrefs = {
  emailEnabled: true,
  lineEnabled: true,
  pushEnabled: true,
  frequency: "immediate",
  quietHoursStart: null,
  quietHoursEnd: null,
  scoutEnabled: true,
}

export const FREQUENCY_LABELS: Record<NotificationFrequency, string> = {
  immediate: "即時配信",
  daily: "1 日 1 回まとめ",
  weekly: "週 1 回まとめ",
}

/**
 * Json 値を型安全に NotificationPrefs に正規化。
 * 不正値は DEFAULT_PREFS の値で補完。
 */
export function parsePrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== "object") return DEFAULT_PREFS
  const v = value as Record<string, unknown>
  return {
    emailEnabled: typeof v.emailEnabled === "boolean" ? v.emailEnabled : DEFAULT_PREFS.emailEnabled,
    lineEnabled: typeof v.lineEnabled === "boolean" ? v.lineEnabled : DEFAULT_PREFS.lineEnabled,
    pushEnabled: typeof v.pushEnabled === "boolean" ? v.pushEnabled : DEFAULT_PREFS.pushEnabled,
    frequency:
      v.frequency === "daily" || v.frequency === "weekly" || v.frequency === "immediate"
        ? v.frequency
        : DEFAULT_PREFS.frequency,
    quietHoursStart:
      typeof v.quietHoursStart === "number" && v.quietHoursStart >= 0 && v.quietHoursStart <= 23
        ? v.quietHoursStart
        : null,
    quietHoursEnd:
      typeof v.quietHoursEnd === "number" && v.quietHoursEnd >= 0 && v.quietHoursEnd <= 23
        ? v.quietHoursEnd
        : null,
    scoutEnabled: typeof v.scoutEnabled === "boolean" ? v.scoutEnabled : DEFAULT_PREFS.scoutEnabled,
  }
}

/**
 * 現在時刻 (JST) が静音時間帯に含まれるか。
 *
 * - start/end のどちらかが null なら常に false
 * - start < end (例: 22-07) は「22 時以降または 7 時未満」に該当
 * - start === end は無効と見なす
 */
export function isInQuietHours(prefs: NotificationPrefs, at: Date = new Date()): boolean {
  const { quietHoursStart: s, quietHoursEnd: e } = prefs
  if (s == null || e == null || s === e) return false
  const jstHour = (at.getUTCHours() + 9) % 24
  if (s < e) {
    // 例: 9-18 → 9 以上 18 未満
    return jstHour >= s && jstHour < e
  }
  // 例: 22-7 → 22 以上 もしくは 7 未満
  return jstHour >= s || jstHour < e
}
