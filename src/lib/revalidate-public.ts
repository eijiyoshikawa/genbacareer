import { revalidatePath } from "next/cache"

/**
 * 求人公開状態の変更（公開 / 更新 / 終了 / 削除）後に呼ぶ。
 * ホーム (ISR 24h) と企業詳細 (ISR 1h) を即座に再生成する。
 *
 * /jobs /jobs/[id] /categories/[category] /[prefecture] は dynamic レンダリング
 * なのでキャッシュは無く、呼ぶ必要は無い。
 *
 * revalidatePath が失敗してもメインの DB 書き込みは成功しているので、
 * 例外で API レスポンスを壊さないよう catch する。
 */
export function revalidateAfterJobChange(opts: { companyId?: string | null } = {}): void {
  try {
    revalidatePath("/")
    if (opts.companyId) {
      revalidatePath(`/companies/${opts.companyId}`)
    }
  } catch (e) {
    console.warn(`[revalidate] job change failed: ${e instanceof Error ? e.message : e}`)
  }
}

/**
 * 記事公開状態の変更（公開 / 更新 / 削除）後に呼ぶ。
 * ホーム (ISR 24h) / マガジン一覧 (ISR 30 分) / 記事詳細 (ISR 1h) を再生成。
 */
export function revalidateAfterArticleChange(opts: { slug?: string | null } = {}): void {
  try {
    revalidatePath("/")
    revalidatePath("/journal")
    if (opts.slug) {
      revalidatePath(`/journal/${opts.slug}`)
    }
  } catch (e) {
    console.warn(`[revalidate] article change failed: ${e instanceof Error ? e.message : e}`)
  }
}
