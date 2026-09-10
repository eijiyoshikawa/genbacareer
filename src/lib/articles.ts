import { MAGAZINE_CATEGORY_VALUES } from "./article-categories"

/**
 * Article 関連のクエリで使う共通フィルタ。
 *
 * `status: "published"` だけでは未来日付（`publishedAt > now()`）の記事も
 * 表示されてしまうため、`publishedAt <= now()` の上限を加えて
 * 「公開予定だけど時刻が来ていない記事」を確実に除外する。
 *
 * 管理画面（/admin/articles）では未来記事もプレビュー対象なので、
 * このヘルパーは公開向けクエリでのみ使用する。
 *
 * `Article` テーブルはマガジン記事（career/salary/... の 6 カテゴリ）と
 * ヘルプ記事（help-seeker / help-employer）を同じテーブルで管理している。
 * /journal 系のページ・フィード・サイトマップでこの関数を単体で使うと、
 * ヘルプ記事が「マガジン記事」として /journal/[slug] に漏れて表示されて
 * しまう。/journal 配下のクエリでは必ず publishedMagazineArticleFilter を
 * 使うこと。
 */
export function publishedArticleFilter() {
  return {
    status: "published" as const,
    publishedAt: { lte: new Date() },
  }
}

/**
 * publishedArticleFilter に加えて、マガジンの 6 カテゴリのみに絞る。
 * /journal 配下（一覧・詳細・RSS・OGP・著者ページ・タグページ）と
 * ホーム / image-sitemap の「最新記事」セクションで使用する。
 */
export function publishedMagazineArticleFilter() {
  return {
    ...publishedArticleFilter(),
    category: { in: [...MAGAZINE_CATEGORY_VALUES] },
  }
}
