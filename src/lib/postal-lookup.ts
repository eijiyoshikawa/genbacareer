/**
 * 郵便番号 → 住所ルックアップ。
 *
 * 外部の zipcloud API (https://zipcloud.ibsnet.co.jp) をサーバー側から叩いて
 * 都道府県 / 市区町村 / 町域を返す。クライアントからは同一オリジンの
 * /api/postal を経由するため、CSP connect-src や CORS の追加設定は不要。
 *
 * zipcloud は無料・APIキー不要。結果はほぼ不変なので長めにキャッシュする。
 */

export type PostalAddress = {
  /** 都道府県（例: 東京都） PREFECTURES の値と一致する */
  prefecture: string
  /** 市区町村（例: 千代田区） */
  city: string
  /** 町域（例: 千代田） 無い場合は空文字 */
  town: string
}

type ZipcloudResult = {
  address1?: string
  address2?: string
  address3?: string
}

type ZipcloudResponse = {
  status: number
  message: string | null
  results: ZipcloudResult[] | null
}

/** 全角数字・ハイフン等を除去して 7 桁の数字だけ取り出す */
export function normalizeZip(raw: string): string {
  const half = raw.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0)
  )
  return half.replace(/[^0-9]/g, "")
}

/**
 * 7 桁の郵便番号から住所を引く。見つからなければ null。
 * ネットワークエラー等も握りつぶして null を返す（フォーム入力の補助なので
 * 失敗しても手入力にフォールバックできれば十分）。
 */
export async function lookupAddressByZip(
  rawZip: string
): Promise<PostalAddress | null> {
  const zip = normalizeZip(rawZip)
  if (zip.length !== 7) return null

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`,
      // 住所マスタはほぼ不変。1 日キャッシュして upstream 負荷を抑える。
      { next: { revalidate: 86_400 } }
    )
    if (!res.ok) return null

    const data = (await res.json()) as ZipcloudResponse
    const first = data.results?.[0]
    if (!first?.address1) return null

    return {
      prefecture: first.address1 ?? "",
      city: first.address2 ?? "",
      town: first.address3 ?? "",
    }
  } catch {
    return null
  }
}
