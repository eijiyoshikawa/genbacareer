import { type NextRequest } from "next/server"
import { lookupAddressByZip, normalizeZip } from "@/lib/postal-lookup"

/**
 * GET /api/postal?zip=1000001
 *
 * 郵便番号（7 桁）から住所（都道府県 / 市区町村 / 町域）を返す。
 * 登録・プロフィール等のフォームで住所を自動補完するための公開エンドポイント。
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("zip") ?? ""
  const zip = normalizeZip(raw)

  if (zip.length !== 7) {
    return Response.json(
      { error: "郵便番号は 7 桁で入力してください" },
      { status: 400 }
    )
  }

  const address = await lookupAddressByZip(zip)
  if (!address) {
    return Response.json(
      { error: "該当する住所が見つかりませんでした" },
      { status: 404 }
    )
  }

  return Response.json({ address })
}
