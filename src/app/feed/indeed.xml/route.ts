/**
 * GET /feed/indeed.xml
 *
 * 旧 Indeed 専用フィード実装。/jobs.xml (docs/job-feeds.md) に統合される前の
 * 実装が残っていたもので、フィルタ条件が独自実装のまま古くなっていた:
 *   - source='direct' 絞り込みがなく HelloWork 取り込み求人まで配信していた
 *     (HelloWork は国側の別フィードで Indeed に渡るため二重配信になる)
 *   - 企業プラン (課金/期限) の絞り込みがなく campaign_free (¥0 無期限枠) も
 *     配信していた (外部配信コストに見合わないため /jobs.xml では除外方針)
 *
 * ロジックを二重管理せず、常に最新仕様の /jobs.xml へ委譲する。
 * 既に Indeed 側にこの URL が登録済みでも 308 でフォローされるため
 * 移行の手間なく安全に統一できる。
 */

import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/jobs.xml?source=indeed", request.url),
    308
  )
}
