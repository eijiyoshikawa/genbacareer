/**
 * LINE 応募フォームの入力値まわりの共通処理。
 */

/**
 * 電話番号を検証前に正規化する。
 * 日本語 IME のまま入力された全角数字 (０９０…) や長音・全角ハイフン (ー / －) を
 * 半角に揃える。これらは type="tel" でも入力でき、以前は形式エラーで弾いていた。
 */
export function normalizeLeadPhone(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[‐‑‒–—―ー−]/g, "-")
    .trim()
}

/** 利用者に見せてよい入力項目 (これ以外の検証エラーは内部項目なので汎用文言にする)。 */
const USER_FIELDS = new Set(["name", "phone", "email", "experienceYears", "notes"])

/** Zod の issues から、応募フォームに表示する日本語メッセージを 1 つ選ぶ。 */
export function leadValidationMessage(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): string {
  const issue = issues.find((i) => USER_FIELDS.has(String(i.path[0])))
  return issue?.message ?? "入力内容をご確認のうえ、もう一度お試しください。"
}
