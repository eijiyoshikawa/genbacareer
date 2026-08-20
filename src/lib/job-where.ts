import type { Prisma } from "@prisma/client"

/**
 * NG キーワード除外フィルタ。title / description のいずれにも含まれない求人だけを残す。
 *
 * 戻り値に型注釈を付けているのが重要。呼び出し側は `where` を変数で組み立てるため
 * 余剰プロパティチェックが効かず、下記 2 点のミスを tsc が検知できない:
 *
 * 1. mode は not の内側ではなく StringFilter 直下に置く。
 *    `{ not: { contains, mode } }` は NestedStringFilter に mode が無いため
 *    実行時に PrismaClientValidationError となり、/jobs が 500 になる。
 * 2. description が NULL の求人は `not` だけでは一致せず落ちてしまうため、
 *    NULL を明示的に許可する。
 */
export function buildExcludeKeywordFilter(
  keywords: readonly string[]
): Prisma.JobWhereInput[] {
  return keywords.filter(Boolean).map((kw) => ({
    AND: [
      { title: { not: { contains: kw }, mode: "insensitive" } },
      {
        OR: [
          { description: null },
          { description: { not: { contains: kw }, mode: "insensitive" } },
        ],
      },
    ],
  }))
}
