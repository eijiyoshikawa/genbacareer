/**
 * src/lib/article-rewrite.ts
 *
 * GSC（Search Console）データに基づくマガジン記事の自動リライト基盤。
 *
 * 目的:
 *   「表示回数は多いが CTR / 掲載順位が低い」= リライトで PV 改善余地が
 *   最大の記事を上位 N 件選び、実際の流入検索クエリに沿って本文を加筆改善し、
 *   PV（自然検索流入）を底上げする。3 日に 1 回 cron で実行する。
 *
 * 安全設計（完全自動公開のため特に重要）:
 *   - slug は固定（URL / 被リンク / canonical を壊さない）
 *   - 改稿前を ArticleRevision に退避 → いつでもロールバック可能
 *   - クールダウン（既定 30 日）で同じ記事を繰り返し触らない
 *   - AI 出力を validateRewrite で検証し、異常なら公開せずスキップ
 *   - キルスイッチ ARTICLE_REWRITE_ENABLED（"true" 以外は dry-run 扱い）
 *   - Google の品質方針に配慮し「実クエリに基づく改善」に限定（無からの量産はしない）
 *
 * テスト容易性のため、選定・スコアリング・検証・プロンプト生成は純関数。
 * DB / Anthropic 呼び出しは runArticleRewrite に集約する。
 */

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/db"
import { ensureSchema } from "@/lib/ensure-schema"

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

/** GSC スナップショット 1 行（DB / API 双方から渡せる最小形）。 */
export type GscSnapshotRow = {
  query: string
  page: string
  clicks: number
  impressions: number
  position: number
}

/** ページ単位に集計したメトリクス。 */
export type PageMetric = {
  page: string
  slug: string
  impressions: number
  clicks: number
  ctr: number
  /** impressions 加重平均の掲載順位。 */
  position: number
  /** 流入の多い検索クエリ（impressions 降順）。 */
  topQueries: Array<{
    query: string
    impressions: number
    clicks: number
    position: number
  }>
}

/** リライト対象として選ばれた記事 + 根拠。 */
export type RewriteCandidate = {
  metric: PageMetric
  score: number
}

/** AI が返す改稿結果。 */
export type RewriteResult = {
  title?: string
  body: string
  excerpt?: string
  metaDescription?: string
}

/** 自動リライト対象になりうる Article の最小サブセット。 */
export type RewriteArticle = {
  id: string
  slug: string
  title: string
  body: string
  excerpt: string | null
  metaDescription: string | null
  category: string
  subcategory: string | null
  tags: string[]
  lastRewrittenAt: Date | null
}

// ---------------------------------------------------------------------------
// URL → slug
// ---------------------------------------------------------------------------

/**
 * 記事 URL（GSC の page）から journal の slug を取り出す。
 * 例: "https://www.genbacareer.jp/journal/foo-bar?utm=x" → "foo-bar"
 * journal 記事 URL でなければ null。
 */
export function slugFromUrl(page: string): string | null {
  let pathname = page
  try {
    pathname = new URL(page).pathname
  } catch {
    // 相対パスや不正 URL はそのまま pathname 扱い
  }
  const m = pathname.match(/\/journal\/([^/?#]+)\/?$/)
  if (!m) return null
  const slug = decodeURIComponent(m[1]).trim()
  return slug.length > 0 ? slug : null
}

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

/**
 * GSC スナップショット行をページ単位に集計する。
 * journal 記事 URL のページのみを対象にする。
 */
export function aggregatePageMetrics(
  rows: GscSnapshotRow[],
  opts: { topQueriesPerPage?: number } = {}
): PageMetric[] {
  const topN = opts.topQueriesPerPage ?? 8
  type Acc = {
    slug: string
    impressions: number
    clicks: number
    positionWeighted: number // Σ position*impressions
    queries: Map<string, { impressions: number; clicks: number; positionWeighted: number }>
  }
  const byPage = new Map<string, Acc>()

  for (const r of rows) {
    const slug = slugFromUrl(r.page)
    if (!slug) continue
    const imp = r.impressions > 0 ? r.impressions : 0
    let acc = byPage.get(r.page)
    if (!acc) {
      acc = { slug, impressions: 0, clicks: 0, positionWeighted: 0, queries: new Map() }
      byPage.set(r.page, acc)
    }
    acc.impressions += imp
    acc.clicks += r.clicks
    acc.positionWeighted += r.position * imp
    const q = acc.queries.get(r.query) ?? {
      impressions: 0,
      clicks: 0,
      positionWeighted: 0,
    }
    q.impressions += imp
    q.clicks += r.clicks
    q.positionWeighted += r.position * imp
    acc.queries.set(r.query, q)
  }

  const metrics: PageMetric[] = []
  for (const [page, acc] of byPage) {
    const position = acc.impressions > 0 ? acc.positionWeighted / acc.impressions : 0
    const ctr = acc.impressions > 0 ? acc.clicks / acc.impressions : 0
    const topQueries = Array.from(acc.queries.entries())
      .map(([query, q]) => ({
        query,
        impressions: q.impressions,
        clicks: q.clicks,
        position: q.impressions > 0 ? q.positionWeighted / q.impressions : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, topN)
    metrics.push({
      page,
      slug: acc.slug,
      impressions: acc.impressions,
      clicks: acc.clicks,
      ctr,
      position,
      topQueries,
    })
  }
  return metrics
}

// ---------------------------------------------------------------------------
// スコアリング
// ---------------------------------------------------------------------------

/**
 * 掲載順位に対する経験的な期待 CTR（おおまかな曲線）。
 * リライトで埋められる「CTR の伸びしろ」を見積もるために使う。
 */
export function expectedCtrForPosition(position: number): number {
  if (position <= 1) return 0.28
  if (position <= 2) return 0.15
  if (position <= 3) return 0.1
  if (position <= 5) return 0.06
  if (position <= 10) return 0.03
  if (position <= 20) return 0.012
  return 0.005
}

/**
 * リライトによる PV 改善余地スコア。
 *   - 表示回数が多いほど高い（母数が大きい）
 *   - 実 CTR が期待 CTR を下回るほど高い（改善余地）
 *   - 圏外(>30位)は本文改善だけでは届きにくいので減衰、
 *     1〜2 位の上澄みも伸びしろ小として減衰、5〜20 位の "あと一歩" を重視
 *
 * 「月間 impressions × 取りこぼし CTR」≒ 取りこぼしクリック数の近似。
 */
export function scoreOpportunity(input: {
  impressions: number
  ctr: number
  position: number
}): number {
  const { impressions, ctr, position } = input
  if (impressions <= 0) return 0
  const expected = expectedCtrForPosition(position)
  const ctrGap = Math.max(0, expected - ctr)
  let positionWeight: number
  if (position < 3) positionWeight = 0.3
  else if (position <= 20) positionWeight = 1
  else if (position <= 30) positionWeight = 0.6
  else positionWeight = 0.2
  // 取りこぼしクリック数の近似 + 取りこぼしが無くても impressions 規模を僅かに加点
  return (impressions * ctrGap + impressions * 0.0005) * positionWeight
}

// ---------------------------------------------------------------------------
// 選定
// ---------------------------------------------------------------------------

export type SelectOptions = {
  /** 上位何件をリライトするか。 */
  limit: number
  /** 集計期間内の最小 impressions（ノイズ除去）。 */
  minImpressions?: number
  /**
   * 平均掲載順位の上限。これより下位（圏外）は本文リライトだけでは
   * 順位が動きにくく、自動公開する価値が低いため対象外にする。既定 40。
   */
  maxPosition?: number
  /** クールダウン日数（直近この日数にリライト済みなら除外）。 */
  cooldownDays?: number
  /** 現在時刻（テスト用に注入可能）。 */
  now?: Date
}

/**
 * ページメトリクスと記事を突き合わせ、リライト対象を選定する。
 * - GSC に出ている journal 記事のみ（= 公開され流入のある記事）
 * - クールダウン中・impressions 不足は除外
 * - スコア降順で limit 件
 */
export function selectCandidates(
  metrics: PageMetric[],
  articles: RewriteArticle[],
  opts: SelectOptions
): RewriteCandidate[] {
  const minImpressions = opts.minImpressions ?? 30
  const maxPosition = opts.maxPosition ?? 40
  const cooldownDays = opts.cooldownDays ?? 30
  const now = opts.now ?? new Date()
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000

  const bySlug = new Map(articles.map((a) => [a.slug, a]))

  const candidates: RewriteCandidate[] = []
  for (const metric of metrics) {
    if (metric.impressions < minImpressions) continue
    if (metric.position > maxPosition) continue // 圏外は本文改善だけでは届きにくい
    const article = bySlug.get(metric.slug)
    if (!article) continue
    if (
      article.lastRewrittenAt &&
      now.getTime() - article.lastRewrittenAt.getTime() < cooldownMs
    ) {
      continue // クールダウン中
    }
    const score = scoreOpportunity({
      impressions: metric.impressions,
      ctr: metric.ctr,
      position: metric.position,
    })
    if (score <= 0) continue
    candidates.push({ metric, score })
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, Math.max(0, opts.limit))
}

// ---------------------------------------------------------------------------
// 検証
// ---------------------------------------------------------------------------

export type ValidationResult = { ok: true } | { ok: false; reason: string }

/**
 * AI 改稿結果が公開して安全かを検証する。
 * - 本文が空・極端に短い/長い・原文とほぼ同一でないか
 * - メタ各種が DB 長制限を超えていないか
 */
export function validateRewrite(
  original: RewriteArticle,
  result: RewriteResult
): ValidationResult {
  const body = result.body?.trim() ?? ""
  if (body.length === 0) return { ok: false, reason: "本文が空" }

  const origLen = original.body.trim().length
  if (origLen > 0) {
    if (body.length < Math.max(300, origLen * 0.6)) {
      return { ok: false, reason: "本文が短すぎる（情報欠落の疑い）" }
    }
    if (body.length > origLen * 4 + 3000) {
      return { ok: false, reason: "本文が長すぎる（暴走の疑い）" }
    }
  }
  if (body === original.body.trim()) {
    return { ok: false, reason: "原文と同一（改善なし）" }
  }
  if (result.title !== undefined && result.title.trim().length === 0) {
    return { ok: false, reason: "タイトルが空" }
  }
  if (result.title && result.title.length > 200) {
    return { ok: false, reason: "タイトルが長すぎる(>200)" }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// プロンプト
// ---------------------------------------------------------------------------

const REWRITE_SYSTEM_PROMPT = `あなたは建設業界専門の求人メディア「ゲンバキャリア」の SEO 編集者です。
既存記事を、実際にその記事へ流入している検索クエリに沿ってリライト（加筆改善）します。

厳守事項:
- 事実を捏造しない。誇大表現・誤情報を入れない。
- 既存の正確な情報は保持しつつ、検索意図に対する不足を補う。
- 建設業界（建築/土木/電気設備/内装/解体/施工管理/測量設計 等）の文脈に忠実。
- 見出し構成を整理し、導入文で検索意図に即答する。読者の悩み解決を最優先。
- 過度なキーワード詰め込み（キーワードスタッフィング）をしない。自然な日本語。
- 本文は元記事と同じ HTML 形式（<h2>,<h3>,<p>,<ul>,<li> 等）で出力する。
- スラッグ・URL は変更対象ではない（本文・タイトル・メタのみ改善）。

出力は必ず次の JSON のみ（前後に説明文やコードフェンスを付けない）:
{
  "title": "改善後タイトル（全角35字程度まで。変更不要なら元のまま）",
  "metaDescription": "検索結果用の説明文（全角120字程度まで）",
  "excerpt": "一覧用の要約（全角100字程度まで）",
  "body": "改善後の本文HTML"
}`

/** リライト用のユーザープロンプトを生成（純関数）。 */
export function buildRewriteUserPrompt(
  article: RewriteArticle,
  metric: PageMetric
): string {
  const queryLines = metric.topQueries
    .map(
      (q) =>
        `- 「${q.query}」 表示${q.impressions} / クリック${q.clicks} / 平均順位${q.position.toFixed(1)}`
    )
    .join("\n")

  return `# 既存記事
カテゴリ: ${article.category}${article.subcategory ? ` / ${article.subcategory}` : ""}
タグ: ${article.tags.join(", ") || "(なし)"}
現在のタイトル: ${article.title}
現在のmeta: ${article.metaDescription ?? "(なし)"}

## 現在の本文(HTML)
${article.body}

# この記事に流入している検索クエリ（直近の Search Console データ）
${queryLines || "(データなし)"}

# 指示
上記クエリの検索意図に照らして、この記事の「取りこぼし」を埋めるようにリライトしてください。
特に平均順位が 5〜20 位のクエリは、本文の充実とタイトル/メタの訴求改善でクリック率を
伸ばせる余地があります。元記事の正確な情報は保持し、不足している観点・具体例・手順・
最新の留意点を補ってください。最終出力は指定の JSON のみ。`
}

// ---------------------------------------------------------------------------
// AI 呼び出し
// ---------------------------------------------------------------------------

export const REWRITE_MODEL = "claude-sonnet-4-6"

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

/** ```json フェンス等を剥がして JSON.parse する。 */
export function parseRewriteJson(text: string): RewriteResult | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim()
  try {
    const parsed = JSON.parse(stripped) as Record<string, unknown>
    if (typeof parsed.body !== "string" || parsed.body.trim().length === 0) {
      return null
    }
    const out: RewriteResult = { body: parsed.body }
    if (typeof parsed.title === "string") out.title = parsed.title.trim()
    if (typeof parsed.excerpt === "string") out.excerpt = parsed.excerpt.trim()
    if (typeof parsed.metaDescription === "string") {
      out.metaDescription = parsed.metaDescription.trim()
    }
    return out
  } catch {
    return null
  }
}

async function rewriteArticle(
  article: RewriteArticle,
  metric: PageMetric
): Promise<RewriteResult | null> {
  const client = getClient()
  if (!client) return null
  const res = await client.messages.create({
    model: REWRITE_MODEL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: REWRITE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: buildRewriteUserPrompt(article, metric) },
    ],
  })
  const block = res.content[0]
  if (!block || block.type !== "text") return null
  return parseRewriteJson(block.text)
}

// ---------------------------------------------------------------------------
// オーケストレータ
// ---------------------------------------------------------------------------

export type RunOptions = {
  /** 1 回あたりのリライト本数。 */
  limit?: number
  /** 集計期間（日）。 */
  windowDays?: number
  minImpressions?: number
  maxPosition?: number
  cooldownDays?: number
  /** true なら DB を書き換えず候補のみ算出。 */
  dryRun?: boolean
}

export type RunSummary = {
  enabled: boolean
  dryRun: boolean
  scanned: number
  candidates: Array<{ slug: string; score: number; impressions: number; position: number }>
  rewritten: Array<{ slug: string; revisionId: string }>
  skipped: Array<{ slug: string; reason: string }>
}

function isEnabled(): boolean {
  return process.env.ARTICLE_REWRITE_ENABLED === "true"
}

/** DB 長制限に収まるよう安全側に丸める。 */
function clamp(s: string | undefined, max: number): string | undefined {
  if (s === undefined) return undefined
  const t = s.trim()
  if (t.length === 0) return undefined
  return t.length > max ? t.slice(0, max) : t
}

/**
 * GSC スナップショット（DB）→ 候補選定 → リライト → 検証 → 版退避 + 公開。
 * キルスイッチ未設定 / dryRun の場合は候補算出までで書き込みしない。
 */
export async function runArticleRewrite(opts: RunOptions = {}): Promise<RunSummary> {
  // article_revisions / articles.last_rewritten_at・rewrite_count は cron 専用ルート
  // からのみ叩かれ、layout.tsx の fire-and-forget self-heal を経由しないため明示的に待つ。
  await ensureSchema()
  const limit = opts.limit ?? 3
  const windowDays = opts.windowDays ?? 28
  const enabled = isEnabled()
  const dryRun = opts.dryRun ?? !enabled

  const summary: RunSummary = {
    enabled,
    dryRun,
    scanned: 0,
    candidates: [],
    rewritten: [],
    skipped: [],
  }

  // 1) 直近 windowDays の GSC スナップショットを取得
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const rows = await prisma.searchConsoleSnapshot.findMany({
    where: { date: { gte: since } },
    select: {
      query: true,
      page: true,
      clicks: true,
      impressions: true,
      position: true,
    },
  })
  const metrics = aggregatePageMetrics(rows)
  summary.scanned = metrics.length

  // 2) 公開中の記事を取得（GSC に出ている slug のみに絞る）
  const slugs = metrics.map((m) => m.slug)
  const articles = await prisma.article.findMany({
    where: { slug: { in: slugs }, status: "published" },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      excerpt: true,
      metaDescription: true,
      category: true,
      subcategory: true,
      tags: true,
      lastRewrittenAt: true,
    },
  })

  const candidates = selectCandidates(metrics, articles, {
    limit,
    minImpressions: opts.minImpressions,
    maxPosition: opts.maxPosition,
    cooldownDays: opts.cooldownDays,
  })
  summary.candidates = candidates.map((c) => ({
    slug: c.metric.slug,
    score: Math.round(c.score * 100) / 100,
    impressions: c.metric.impressions,
    position: Math.round(c.metric.position * 10) / 10,
  }))

  if (dryRun) return summary

  const bySlug = new Map(articles.map((a) => [a.slug, a]))

  // 3) リライト → 検証 → 版退避 + 公開
  for (const cand of candidates) {
    const article = bySlug.get(cand.metric.slug)
    if (!article) continue
    try {
      const result = await rewriteArticle(article, cand.metric)
      if (!result) {
        summary.skipped.push({ slug: article.slug, reason: "AI 生成失敗 / 未設定" })
        continue
      }
      const valid = validateRewrite(article, result)
      if (!valid.ok) {
        summary.skipped.push({ slug: article.slug, reason: valid.reason })
        continue
      }

      const reason = `score=${Math.round(cand.score)} top="${cand.metric.topQueries[0]?.query ?? ""}"`
      const created = await prisma.$transaction(async (tx) => {
        // 改稿"前"を退避
        const revision = await tx.articleRevision.create({
          data: {
            articleId: article.id,
            title: article.title,
            body: article.body,
            excerpt: article.excerpt,
            metaDescription: article.metaDescription,
            source: "auto-rewrite",
            reason: clamp(reason, 500),
            modelName: REWRITE_MODEL,
          },
          select: { id: true },
        })
        // 改稿後を反映（slug は変更しない / 公開状態を維持）
        await tx.article.update({
          where: { id: article.id },
          data: {
            title: clamp(result.title, 200) ?? article.title,
            body: result.body.trim(),
            excerpt: clamp(result.excerpt, 500) ?? article.excerpt,
            metaDescription:
              clamp(result.metaDescription, 300) ?? article.metaDescription,
            lastRewrittenAt: new Date(),
            rewriteCount: { increment: 1 },
          },
        })
        return revision
      })
      summary.rewritten.push({ slug: article.slug, revisionId: created.id })
    } catch (e) {
      summary.skipped.push({
        slug: article.slug,
        reason: `例外: ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

  return summary
}
