/**
 * OGP 画像 (next/og ImageResponse) 用のテキストサニタイズ。
 *
 * 求人タイトル等に含まれがちな装飾記号（◎急募◎ / ≪未経験歓迎≫ など）は、
 * satori のフォールバックフォント自動取得 (dynamic font) が対応しておらず
 * "Failed to load dynamic font" で画像生成自体が失敗することがある
 * (本番で /jobs/[id]/opengraph-image にて継続的に観測)。
 * 意味的な情報を持たない装飾記号なので、OG 画像描画時のみ除去する。
 */
const OG_DECORATIVE_SYMBOLS =
  /[◇◆□■○●◎☆★▲△▼▽≪≫《》【】]/g

export function sanitizeOgText(text: string): string {
  return text.replace(OG_DECORATIVE_SYMBOLS, "").replace(/\s{2,}/g, " ").trim()
}
