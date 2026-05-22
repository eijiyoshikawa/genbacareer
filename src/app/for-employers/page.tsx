import Link from "next/link"
import {
  ArrowRight,
  Phone,
  Users,
  Award,
  Briefcase,
  TrendingUp,
  MessageSquareQuote,
  ClipboardList,
  Headphones,
  FileEdit,
  PlayCircle,
  ChevronRight,
  CheckCircle,
  CircleAlert,
  Search,
  HardHat,
} from "lucide-react"
import type { Metadata } from "next"
import { AnimateOnScroll } from "@/components/animate-on-scroll"
import { LogoSlider } from "@/components/logo-slider"

export const metadata: Metadata = {
  title: "建設会社の採用担当者の方へ",
  description:
    "掲載料 無料キャンペーン中、成果報酬は 1 名 49.8 万円〜（職種による）。建設業界に特化したゲンバキャリアで、建築・土木・設備の人材を採用。",
}

const jobCategories = [
  "建築・躯体工事の求人をお探しの方",
  "施工管理技術者をお探しの方",
  "土木作業員をお探しの方",
  "電気設備管理人材をお探しの方",
]

const reasons = [
  {
    icon: Users,
    title: "建設業界の求職者が集まるサイト",
    description: "建築・土木・設備・解体の求人に特化しているため、現場経験のある求職者が中心です。",
  },
  {
    icon: Award,
    title: "有資格者が多い",
    description: "施工管理技士・電気工事士・クレーン免許など、業界に必要な資格を持つ求職者が登録しています。",
  },
  {
    icon: Briefcase,
    title: "掲載からスカウトまで対応",
    description: "求人の掲載だけでなく、条件に合う求職者への直接スカウトも可能です。",
  },
]

const trackRecordPoints = [
  {
    title: "建設業界に特化",
    description: "掲載求人のほぼ全てが建設・設備・解体関連。業界の求職者に確実に届きます。",
  },
  {
    title: "スカウト機能",
    description: "登録求職者のプロフィールを閲覧し、直接メッセージを送ることができます。",
  },
]

const testimonials = [
  {
    company: "千葉県の総合建設会社（従業員50名）",
    comment: "大手の求人媒体では応募が来なかった施工管理のポジションで、2名の採用に至りました。業界特化のサイトだからこそだと思います。",
  },
  {
    company: "大阪府の電気設備会社（従業員30名）",
    comment: "掲載費が無料なので試しに使い始めましたが、有資格者からの応募があり驚きました。今は継続して利用しています。",
  },
  {
    company: "埼玉県の解体工事会社（従業員15名）",
    comment: "若い人の応募が少なくて困っていましたが、20代からの応募がありました。スカウト機能も使いやすいです。",
  },
]

const steps = [
  { icon: Headphones, label: "問い合わせ" },
  { icon: ClipboardList, label: "採用条件\nヒアリング" },
  { icon: FileEdit, label: "広告作成" },
  { icon: PlayCircle, label: "掲載開始" },
]

const comparisonRows = [
  {
    label: "登録ユーザー",
    ours: "建設業界の求職者が中心",
    major: "人口動態に比例",
    niche: "40〜50代が多い",
  },
  {
    label: "費用",
    ours: "選べる 3 プラン\n①成果報酬 49.8 万円〜（職種による）\n②月額 49,800 円 / 12ヶ月\n③月額 30,000 円 / 24ヶ月\n※掲載料 無料キャンペーン中",
    major: "月額30万円〜\n1求人ごとに費用が発生",
    niche: "月額6万円〜\n1求人ごとに費用が発生",
  },
  {
    label: "プラン",
    ours: "求人掲載＆スカウト",
    major: "求人掲載のみ\n（求職者からの応募待ち）",
    niche: "求人掲載のみ\n（求職者からの応募待ち）",
  },
  {
    label: "掲載可能な職種",
    ours: "建設、設備、解体等に特化した\n専門職をカバー",
    major: "ホワイトカラーの\n求人に特化",
    niche: "特定の職種に特化",
  },
  {
    label: "掲載期間",
    ours: "無期限（無料）",
    major: "1〜3ヶ月",
    niche: "1〜6ヶ月",
  },
]

export default function ForEmployersPage() {
  return (
    <div>
      {/* Hero Section - Black with yellow accent stripes */}
      <section className="relative bg-ink-900 py-12 sm:py-16">
        <div className="hero-stripe-top" />
        <div className="hero-stripe-bottom" />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(rgba(245, 180, 0, 0.08) 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            {/* Left side - Text + Category links */}
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-yellow-500">
                建設業・設備業など現場で働く人材の採用に特化
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                現場人材の採用なら
                <br />
                <span className="text-3xl sm:text-4xl lg:text-5xl">ゲンバキャリア</span>
              </h1>

              {/* Stats row */}
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="relative bg-primary-500 px-4 py-2 text-white">
                  <span className="absolute -top-2 -right-2 inline-flex items-center bg-ink-900 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-yellow-300 tracking-wider">
                    期間限定
                  </span>
                  <p className="text-xs font-bold">掲載料</p>
                  <p className="text-base font-black tracking-tight">無料キャンペーン中</p>
                </div>
                <div className="bg-brand-yellow-500 px-4 py-2">
                  <p className="text-xs font-bold text-ink-900">成果報酬</p>
                  <p className="text-base font-black text-ink-900 tracking-tight">1 名 49.8 万円〜（職種による）</p>
                </div>
                <div className="bg-brand-yellow-500 px-4 py-2">
                  <p className="text-xs font-bold text-ink-900">機能</p>
                  <p className="text-base font-black text-ink-900 tracking-tight">スカウト対応</p>
                </div>
              </div>

              {/* Category links */}
              <div className="mt-6 grid grid-cols-2 gap-2">
                {jobCategories.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center gap-2 bg-white px-3 py-2 text-sm font-bold text-ink-900"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                    <span className="text-xs">{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Contact form card */}
            <div className="w-full shrink-0 bg-white p-6 shadow-xl lg:w-96">
              <h2 className="text-center text-lg font-black text-ink-900 tracking-tight">
                掲載をお考えの方はこちら
              </h2>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink-900">電話番号</label>
                  <div className="mt-1 flex items-center gap-2 border border-warm-200 px-3 py-2 text-sm text-ink-900">
                    <Phone className="h-4 w-4 text-primary-500" />
                    <span>06-6786-8320</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="emp-email" className="block text-xs font-bold text-ink-900">メールアドレス</label>
                  <input
                    id="emp-email"
                    type="email"
                    placeholder="example@company.co.jp"
                    className="mt-1 w-full border border-warm-200 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="emp-company" className="block text-xs font-bold text-ink-900">会社名</label>
                  <input
                    id="emp-company"
                    type="text"
                    placeholder="株式会社○○建設"
                    className="mt-1 w-full border border-warm-200 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <Link
                  href="/company/register"
                  className="flex w-full items-center justify-center gap-2 bg-primary-500 px-6 py-3 text-sm font-black text-white tracking-tight hover:bg-primary-600 transition"
                >
                  資料請求する
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4 border-t pt-3 text-center">
                <p className="text-xs text-gray-500">電話でも受付中</p>
                <p className="mt-1 flex items-center justify-center gap-1 text-lg font-black text-ink-900 tracking-tight">
                  <Phone className="h-4 w-4 text-primary-600" />
                  03-6845-3624
                </p>
                <p className="text-xs text-gray-400">平日 10:00〜19:00（土日祝除く）</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LogoSlider />

      {/* About Section */}
      <section className="bg-brand-yellow-500 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="flex flex-col items-center gap-8 sm:flex-row">
              <div className="flex-1">
                <h2 className="text-2xl font-black text-ink-900 tracking-tight">ゲンバキャリアとは</h2>
                <p className="mt-3 text-sm text-ink-900 leading-relaxed">
                  建設業・設備業などの現場人材の採用に強みを持つ日本最大級の「現場人材採用サービス」です。
                  掲載料 無料キャンペーン中・成果報酬は 1 名 49.8 万円〜（職種による）。建築・土木・設備・解体など幅広い職種の人材採用をサポートします。
                </p>
              </div>
              <div className="flex h-36 w-52 shrink-0 flex-col items-center justify-center bg-ink-900 shadow-sm">
                <HardHat className="h-14 w-14 text-brand-yellow-500" />
                <p className="mt-2 text-xs font-bold text-white">建設業界特化</p>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* 3 Reasons Section */}
      <section className="bg-warm-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <h2 className="text-center text-2xl font-black text-ink-900 tracking-tight">
              ゲンバキャリアが選ばれる<span className="text-primary-600">3つの理由</span>
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll animation="stagger">
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {reasons.map((r) => {
                const Icon = r.icon
                return (
                  <div key={r.title} className="bg-white p-6 text-center hover-lift">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center bg-brand-yellow-500">
                      <Icon className="h-10 w-10 text-ink-900" />
                    </div>
                    <h3 className="mt-4 text-base font-black text-ink-900 tracking-tight">{r.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.description}</p>
                  </div>
                )
              })}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Track Record Section */}
      <section className="border-t border-warm-200 bg-warm-100 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimateOnScroll animation="fade-up">
            <h2 className="text-2xl font-black text-ink-900 tracking-tight">
              サービスの特徴
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll animation="stagger">
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:justify-center">
              {trackRecordPoints.map((p) => (
                <div key={p.title} className="flex-1 border border-warm-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary-500" />
                    <h3 className="font-black text-ink-900 tracking-tight">{p.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{p.description}</p>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-warm-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <h2 className="text-center text-2xl font-black text-ink-900 tracking-tight">
              お客様からの声
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll animation="stagger">
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.company} className="border border-warm-200 bg-warm-50 p-5 shadow-sm hover-lift">
                  <MessageSquareQuote className="h-6 w-6 text-brand-yellow-600" />
                  <p className="mt-3 text-sm text-gray-700 leading-relaxed">{t.comment}</p>
                  <p className="mt-3 border-t border-warm-200 pt-3 text-xs font-black text-ink-900 tracking-tight">{t.company}</p>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Flow Section */}
      <section className="border-t border-warm-200 bg-warm-100 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <h2 className="text-center text-2xl font-black text-ink-900 tracking-tight">
              掲載までの流れ
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll animation="fade-up">
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.label} className="flex items-center gap-3 sm:gap-4">
                  <div className="flex flex-col items-center">
                    <div className="relative flex h-16 w-16 items-center justify-center border-2 border-ink-900 bg-brand-yellow-500 shadow-sm">
                      <span className="absolute -top-2.5 -left-2.5 flex h-6 w-6 items-center justify-center bg-primary-500 text-xs font-black text-white tracking-tight shadow-sm">
                        {i + 1}
                      </span>
                      <Icon className="h-7 w-7 text-ink-900" />
                    </div>
                    <span className="mt-2 text-center text-xs font-black text-ink-900 tracking-tight whitespace-pre-line">
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-primary-400 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-t border-warm-200 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <h2 className="text-center text-2xl font-black text-ink-900 tracking-tight">
              他社との<span className="text-primary-600">料金・サービスの比較表</span>
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              ゲンバキャリアは掲載料 無料キャンペーン中、成果報酬は 1 名 49.8 万円〜（職種による）
              <br className="hidden sm:block" />
              採用のミスマッチが少ない人材を低コストで採用可能です
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll animation="fade-up">
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-28 border border-warm-200 bg-warm-100 p-3"></th>
                  <th className="border-2 border-ink-900 bg-ink-900 p-3 text-brand-yellow-500 font-black tracking-tight text-base">
                    ゲンバキャリア
                  </th>
                  <th className="border border-warm-200 bg-warm-100 p-3 font-bold text-gray-700">
                    大手求人媒体
                  </th>
                  <th className="border border-warm-200 bg-warm-100 p-3 font-bold text-gray-700">
                    業界専門の<br />求人媒体
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="border border-warm-200 bg-warm-100 p-3 text-center font-bold text-gray-700">
                      {row.label}
                    </td>
                    <td className="border-2 border-ink-900 bg-brand-yellow-50 p-3 text-center whitespace-pre-line">
                      <div className="flex items-start justify-center gap-1">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                        <span className="text-ink-900 font-bold">{row.ours}</span>
                      </div>
                    </td>
                    <td className="border border-warm-200 p-3 text-center text-gray-500 whitespace-pre-line">
                      <div className="flex items-start justify-center gap-1">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                        <span>{row.major}</span>
                      </div>
                    </td>
                    <td className="border border-warm-200 p-3 text-center text-gray-500 whitespace-pre-line">
                      <div className="flex items-start justify-center gap-1">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                        <span>{row.niche}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Plans Section - 3 プラン詳細 */}
      <section className="border-t border-warm-200 bg-warm-50 py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <h2 className="text-center text-2xl font-black text-ink-900 tracking-tight">
              選べる<span className="text-primary-600">3 つのプラン</span>
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              ※ リリース直近は掲載料 ¥0 キャンペーン実施中。下記プランは通常料金です。
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll animation="stagger">
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {/* ① 成果報酬 */}
              <div className="border-2 border-ink-900 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-primary-600">プラン ①</p>
                <h3 className="mt-1 text-lg font-black text-ink-900 tracking-tight">
                  成果報酬プラン
                </h3>
                <p className="mt-4 text-2xl font-black text-ink-900">
                  ¥498,000
                  <span className="text-sm font-bold text-gray-500">〜 / 名</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">職種により金額変動</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>掲載料 ¥0、採用決定時のみ請求</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>戻入規定あり (早期退職時の安心)</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>初期費用なし</span>
                  </li>
                </ul>
              </div>

              {/* ② 月額 12ヶ月 */}
              <div className="border-2 border-ink-900 bg-white p-6 shadow-sm relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-yellow-500 px-3 py-0.5 text-xs font-extrabold text-ink-900 tracking-wider">
                  人気プラン
                </span>
                <p className="text-xs font-bold text-primary-600">プラン ②</p>
                <h3 className="mt-1 text-lg font-black text-ink-900 tracking-tight">
                  月額掲載 12 ヶ月
                </h3>
                <p className="mt-4 text-2xl font-black text-ink-900">
                  ¥49,800
                  <span className="text-sm font-bold text-gray-500">/ 月</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">年契約・一括前払いで 10% OFF</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>採用ボーナス ¥50,000 を求職者へ</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>応募率向上・若手取り込み強化</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>初期費用 ¥150,000 (キャンペーン中無料)</span>
                  </li>
                </ul>
              </div>

              {/* ③ 月額 24ヶ月 */}
              <div className="border-2 border-ink-900 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold text-primary-600">プラン ③</p>
                <h3 className="mt-1 text-lg font-black text-ink-900 tracking-tight">
                  月額掲載 24 ヶ月
                </h3>
                <p className="mt-4 text-2xl font-black text-ink-900">
                  ¥30,000
                  <span className="text-sm font-bold text-gray-500">/ 月</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">長期契約・一括前払いで 10% OFF</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>採用ボーナス ¥50,000 を求職者へ</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>長期掲載でコスト最適化</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                    <span>初期費用 ¥150,000 (キャンペーン中無料)</span>
                  </li>
                </ul>
              </div>
            </div>
          </AnimateOnScroll>

          <p className="mt-6 text-center text-xs text-gray-500">
            ※ 月額プランは中途解約不可。全プラン請求書払い・銀行振込のみ。
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-warm-200 bg-ink-900 py-12">
        <AnimateOnScroll animation="fade-up">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black tracking-tight text-white">
              まずは無料で掲載を始めましょう
            </h2>
            <p className="mt-2 text-sm text-white/80">
掲載料 無料キャンペーン中・成果報酬型（1 名 49.8 万円〜・職種による）。採用が決まるまで費用はかかりません。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/company/register"
                className="inline-flex items-center justify-center gap-2 bg-primary-500 px-8 py-3.5 text-base font-black tracking-tight text-white shadow-lg hover:bg-primary-600 transition"
              >
                無料で企業登録する
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="tel:03-6845-3624"
                className="inline-flex items-center justify-center gap-2 border-2 border-brand-yellow-500 bg-brand-yellow-500 px-8 py-3.5 text-base font-black tracking-tight text-ink-900 hover:bg-brand-yellow-600 transition"
              >
                <Phone className="h-5 w-5" />
                03-6845-3624
              </a>
            </div>
          </div>
        </AnimateOnScroll>
      </section>
    </div>
  )
}
