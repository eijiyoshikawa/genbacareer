/**
 * `<script type="application/ld+json">` に安全に埋め込むための JSON 文字列化。
 *
 * `JSON.stringify()` の結果をそのまま `dangerouslySetInnerHTML` に渡すと、
 * 値の中に文字列 "</script>" が含まれる場合（求人タイトル/本文・企業紹介文・
 * HelloWork 取り込みデータなど、ユーザー/外部由来の自由入力が混ざるフィールド）
 * に script タグが途中で閉じてしまい、後続の文字列が任意 HTML として解釈される
 * (stored XSS)。"<" を Unicode エスケープすることで JSON としての意味を変えずに
 * これを防ぐ。
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
