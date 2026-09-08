/**
 * /feed/indeed.xml — 旧 Indeed XML feed（廃止・/jobs.xml に統合済み）。
 *
 * このルートは /jobs.xml (Indeed 互換フィード、PR #212 以降) が作られる前の実装で、
 * source="direct" フィルタも企業プラン (campaign_free 除外) フィルタも掛かっておらず、
 * HelloWork 由来求人や無償枠企業の求人まで無条件で外部配信してしまうバグがあった。
 * ドキュメント (docs/job-feeds.md, docs/indeed-integration.md) は既に /jobs.xml のみを
 * 案内しているため、このパスへの外部からのアクセスは新フィードへ誘導する。
 */

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

export async function GET() {
  return Response.redirect(`${SITE_URL}/jobs.xml?source=indeed`, 308)
}
