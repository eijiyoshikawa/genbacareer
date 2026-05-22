/**
 * Article 関連のクエリで使う共通フィルタ。
 *
 * `status: "published"` だけでは未来日付（`publishedAt > now()`）の記事も
 * 表示されてしまうため、`publishedAt <= now()` の上限を加えて
 * 「公開予定だけど時刻が来ていない記事」を確実に除外する。
 *
 * 管理画面（/admin/articles）では未来記事もプレビュー対象なので、
 * このヘルパーは公開向けクエリでのみ使用する。
 */
export function publishedArticleFilter() {
  return {
    status: "published" as const,
    publishedAt: { lte: new Date() },
  }
}
