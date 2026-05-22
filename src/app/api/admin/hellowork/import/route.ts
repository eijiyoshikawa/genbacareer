/**
 * ハローワーク求人インポート Admin API
 *
 * POST /api/admin/hellowork/import
 *
 * 厚生労働省「ハローワーク求人・求職情報提供サービス」の公式 API から求人を取得し、
 * データベースにインポートするバッチ処理を起動するエンドポイント。
 *
 * 認証: 環境変数 ADMIN_API_KEY による API キー認証 (Bearer)。
 * HelloWork API 認証情報は HELLOWORK_API_USER / HELLOWORK_API_PASS から読み込む。
 *
 * リクエストボディ:
 * ```json
 * {
 *   "dryRun": false,         // 任意: ドライランモード (デフォルト false)
 *   "closeOrphans": true,    // 任意: 今回バッチに含まれない HW 求人を closed にする
 *   "maxJobs": 1000          // 任意: 取得する求人の上限件数
 * }
 * ```
 *
 * 公式 API は職種・賃金等での絞り込みに対応していないため、全件取得して
 * 自前 DB に保存する設計。
 *
 * @module admin-hellowork-import
 */

import { type NextRequest } from "next/server"
import { fetchAllJobs } from "@/lib/crawler/hellowork"
import { importHelloworkJobs } from "@/lib/crawler/import-batch"

// ========================================
// 認証
// ========================================

function authenticateAdmin(request: NextRequest): boolean {
  const apiKey = process.env.ADMIN_API_KEY
  if (!apiKey) {
    console.error("[admin/hellowork/import] ADMIN_API_KEY が未設定です")
    return false
  }
  const authHeader = request.headers.get("authorization")
  if (!authHeader) return false
  const [scheme, token] = authHeader.split(" ")
  if (scheme?.toLowerCase() !== "bearer") return false
  return token === apiKey
}

// ========================================
// リクエストバリデーション
// ========================================

interface ImportRequestBody {
  dryRun?: boolean
  closeOrphans?: boolean
  maxJobs?: number
}

function validateRequestBody(
  body: unknown
): { valid: true; data: ImportRequestBody } | { valid: false; message: string } {
  if (body !== null && body !== undefined && typeof body !== "object") {
    return { valid: false, message: "リクエストボディが不正です" }
  }
  const b = (body as Record<string, unknown> | null) ?? {}

  if (b.maxJobs !== undefined) {
    if (typeof b.maxJobs !== "number" || b.maxJobs < 1 || b.maxJobs > 100000) {
      return {
        valid: false,
        message: "maxJobs は 1〜100000 の範囲で指定してください",
      }
    }
  }

  return {
    valid: true,
    data: {
      dryRun: typeof b.dryRun === "boolean" ? b.dryRun : false,
      // closeOrphans=true は「今回バッチに含まれない HW 求人を全部 closed にする」破壊的操作。
      // ローテーション取り込みでは絶対に false にすべきで、UI 側からも明示的に true を送ってきた
      // 場合のみ実行されるよう、デフォルトを false に変更（旧デフォルト true は事故の元）。
      closeOrphans:
        typeof b.closeOrphans === "boolean" ? b.closeOrphans : false,
      maxJobs: typeof b.maxJobs === "number" ? b.maxJobs : undefined,
    },
  }
}

// ========================================
// API ハンドラー
// ========================================

export async function POST(request: NextRequest) {
  if (!authenticateAdmin(request)) {
    return Response.json(
      {
        success: false,
        error:
          "認証に失敗しました。有効な API キーを Authorization ヘッダーに設定してください。",
      },
      { status: 401 }
    )
  }

  let body: unknown = null
  const contentLength = request.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > 0) {
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { success: false, error: "不正な JSON フォーマットです" },
        { status: 400 }
      )
    }
  }

  const validation = validateRequestBody(body)
  if (!validation.valid) {
    return Response.json(
      { success: false, error: validation.message },
      { status: 400 }
    )
  }

  const { dryRun, closeOrphans, maxJobs } = validation.data

  try {
    console.info(
      `[admin/hellowork/import] バッチ開始: dryRun=${dryRun}, maxJobs=${maxJobs ?? "unlimited"}`
    )

    const crawlResult = await fetchAllJobs(undefined, { maxJobs })

    console.info(
      `[admin/hellowork/import] API 取得完了: ${crawlResult.jobs.length} 件`
    )

    const stats = await importHelloworkJobs(crawlResult.jobs, {
      dryRun,
      closeOrphans,
    })

    return Response.json({
      success: true,
      stats: {
        created: stats.created,
        updated: stats.updated,
        closed: stats.closed,
        skipped: stats.skipped,
        errors: stats.errors,
        totalProcessed: stats.totalProcessed,
        durationMs: stats.durationMs,
        startedAt: stats.startedAt.toISOString(),
        finishedAt: stats.finishedAt.toISOString(),
      },
      crawl: {
        totalFound: crawlResult.totalCount,
      },
      dryRun: dryRun ?? false,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました"
    console.error(`[admin/hellowork/import] バッチエラー: ${message}`)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
