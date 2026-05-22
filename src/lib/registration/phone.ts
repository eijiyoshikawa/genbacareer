/**
 * 求職者ウィザード用の携帯番号ユーティリティ。
 *
 * 求職者の登録では「企業からの面接調整連絡」を前提に **携帯番号** を必須化する。
 * 070 / 080 / 090 のいずれかで始まる 11 桁のみ許可。
 * 固定電話 (03-XXXX-XXXX 等) を受け付けたい別経路 (LineLead 等) は
 * 個別に独自バリデーションを持っているのでそちらを利用すること。
 */

/** 全角数字・各種ハイフン・スペース類を除去して半角数字のみの文字列を返す */
export function normalizePhone(input: string): string {
  return input
    .replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/[-－‐‑‒–—―ー\s()（）]/g, "")
}

/** 携帯番号 (070 / 080 / 090 始まりの 11 桁) かどうか */
export function isMobilePhone(input: string): boolean {
  return /^0[789]0\d{8}$/.test(normalizePhone(input))
}
