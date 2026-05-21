import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import {
  Activity,
  Database,
  Mail,
  CreditCard,
  Briefcase,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import type { Metadata } from "next"
import { isGbizConfigured } from "@/lib/gbizinfo"

export const metadata: Metadata = {
  title: "システム状態",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

/**
 * Server-side のみで実行されるデータ取得関数。
 * Date.now() は React 19 で render 中の呼び出しが purity ルールで弾かれるため
 * コンポーネント本体から分離する。
 */
async function loadStatusData() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [
    jobTotal,
    jobActive,
    companyTotal,
    companyApproved,
    userTotal,
    applicationTotal,
    appsLast24h,
    jobsLast24h,
    usersLast24h,
    billingPending,
  ] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: "active" } }),
    prisma.company.count(),
    prisma.company.count({ where: { status: "approved" } }),
    prisma.user.count({ where: { status: { not: "deleted" } } }),
    prisma.application.count(),
    prisma.application.count({ where: { createdAt: { gte: since } } }),
    prisma.job.count({ where: { publishedAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.billingEvent
      .count({ where: { status: { in: ["pending", "invoiced"] } } })
      .catch(() => 0),
  ])
  return {
    jobTotal,
    jobActive,
    companyTotal,
    companyApproved,
    userTotal,
    applicationTotal,
    appsLast24h,
    jobsLast24h,
    usersLast24h,
    billingPending,
  }
}

/**
 * 管理者向け運用ダッシュボード。
 *
 * 含まれる情報:
 *   - 主要テーブルのレコード数 (Job / Company / User / Application)
 *   - 直近 24h のアクティビティ (新規応募 / 新規求人 / 新規 ユーザー)
 *   - 環境変数 / 外部サービス接続性のサマリ
 *   - 直近の BillingEvent (未払い件数)
 *
 * uptime 監視 / SLA トラッキング用ではなく、admin が "何が起きているか"
 * を一目で把握するための状態表示。
 */
export default async function AdminStatusPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "admin") redirect("/")

  const {
    jobTotal,
    jobActive,
    companyTotal,
    companyApproved,
    userTotal,
    applicationTotal,
    appsLast24h,
    jobsLast24h,
    usersLast24h,
    billingPending,
  } = await loadStatusData()

  const envChecks = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_BASE_URL: !!process.env.NEXT_PUBLIC_BASE_URL,
    CRON_SECRET: !!process.env.CRON_SECRET,
    GBIZ_API_TOKEN: isGbizConfigured(),
    SMTP: !!process.env.SMTP_USER && !!process.env.SMTP_PASS,
    SENTRY: !!process.env.SENTRY_DSN,
    GA: !!process.env.NEXT_PUBLIC_GA_ID,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Activity className="h-6 w-6 text-primary-500" />
          システム状態
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          DB 件数 / 直近 24 時間アクティビティ / 環境変数の設定状況をひと目で確認できます。
        </p>
      </div>

      {/* 主要テーブルの件数 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
          コンテンツ
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Briefcase className="h-5 w-5" />}
            label="求人"
            primary={jobActive.toLocaleString()}
            secondary={`active / ${jobTotal.toLocaleString()} 件`}
            delta={`直近 24h: +${jobsLast24h}`}
          />
          <Stat
            icon={<Building2 className="h-5 w-5" />}
            label="企業"
            primary={companyApproved.toLocaleString()}
            secondary={`approved / ${companyTotal.toLocaleString()} 件`}
          />
          <Stat
            icon={<Users className="h-5 w-5" />}
            label="ユーザー"
            primary={userTotal.toLocaleString()}
            secondary="登録済"
            delta={`直近 24h: +${usersLast24h}`}
          />
          <Stat
            icon={<Mail className="h-5 w-5" />}
            label="応募"
            primary={applicationTotal.toLocaleString()}
            secondary="累計"
            delta={`直近 24h: +${appsLast24h}`}
          />
        </div>
      </section>

      {/* 課金 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
          課金
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stat
            icon={<CreditCard className="h-5 w-5" />}
            label="未請求 / 請求中"
            primary={billingPending.toLocaleString()}
            secondary="件 (要 admin 対応)"
            warn={billingPending > 0}
          />
        </div>
      </section>

      {/* 環境変数 */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
          外部サービス接続
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(envChecks).map(([key, ok]) => (
            <li
              key={key}
              className="flex items-center gap-2 border bg-white px-3 py-2 text-sm"
            >
              {ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span className="font-mono text-xs text-gray-600">{key}</span>
              <span
                className={`ml-auto text-xs font-bold ${
                  ok ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {ok ? "設定済" : "未設定"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-400">
          「未設定」は機能が無効化されているだけで、サイトの稼働には影響しません。
          必要に応じて Vercel Dashboard で追加してください。
        </p>
      </section>

      {/* DB / Health */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
          ヘルスチェック
        </h2>
        <div className="mt-3 border bg-white p-4">
          <a
            href="/api/health?full=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:underline"
          >
            <Database className="h-4 w-4" />
            /api/health?full=1 を開く
          </a>
          <p className="mt-1 text-xs text-gray-500">
            DB 接続 + 必須 env vars + デプロイ情報 (commit SHA / region) を JSON で返します。
            uptime 監視ツールから叩く想定。
          </p>
        </div>
      </section>
    </div>
  )
}

function Stat({
  icon,
  label,
  primary,
  secondary,
  delta,
  warn = false,
}: {
  icon: React.ReactNode
  label: string
  primary: string
  secondary: string
  delta?: string
  warn?: boolean
}) {
  return (
    <div
      className={`border bg-white p-4 ${
        warn ? "border-l-4 border-l-amber-500" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{primary}</p>
      <p className="text-xs text-gray-500">{secondary}</p>
      {delta && (
        <p className="mt-1 text-xs font-bold text-primary-600">{delta}</p>
      )}
    </div>
  )
}
