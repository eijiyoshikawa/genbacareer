import Link from "next/link"
import type { Metadata } from "next"
import { HelpCircle, MessageCircle, Search } from "lucide-react"

export const metadata: Metadata = {
  title: "よくある質問 | ゲンバキャリア",
  description:
    "建設業求人サイト「ゲンバキャリア」の使い方・応募方法・料金などのよくある質問。LINE 応募の流れ、未経験者の応募可否、資格取得支援についてもご案内します。",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "よくある質問 | ゲンバキャリア",
    description:
      "建設業求人サイトの使い方、LINE 応募の流れ、料金など、よくある質問にお答えします。",
  },
}

interface QA {
  q: string
  a: string
}

const FAQ: Array<{ section: string; items: QA[] }> = [
  {
    section: "求職者の方",
    items: [
      {
        q: "応募に費用はかかりますか？",
        a: "求職者の方は、応募・会員登録・スカウト受信など、すべての機能を完全無料でご利用いただけます。",
      },
      {
        q: "未経験でも応募できますか？",
        a: "はい、未経験者歓迎の求人が多数掲載されています。研修制度や資格取得支援が充実した会社を「未経験 OK」タグから絞り込めます。",
      },
      {
        q: "LINE 応募とはどのような仕組みですか？",
        a: "気になる求人で「LINE で話を聞きたい」をタップすると、最低限の連絡先（氏名・電話・メール）を入力後、当社の公式 LINE が起動します。LINE 上で担当者と直接やり取りができ、履歴書作成も不要で気軽に応募できます。",
      },
      {
        q: "応募後、企業からどのくらいで連絡が来ますか？",
        a: "通常、ご応募から 1 営業日以内に当社担当者からご連絡を差し上げます。土日祝にご応募の場合は翌営業日となります。",
      },
      {
        q: "アカウント登録なしで応募できますか？",
        a: "LINE 応募であれば会員登録不要で応募可能です。マイページ機能（応募履歴・スカウト受信）をご利用の場合は会員登録（無料）が必要です。",
      },
      {
        q: "資格取得支援はありますか？",
        a: "「資格取得支援」タグの求人では、玉掛け・電気工事士・施工管理技士・大型免許などの取得費用や受講中の日当を会社が負担します。",
      },
      {
        q: "登録情報を変更・削除したい場合は？",
        a: "マイページの「プロフィール編集」で情報を変更できます。アカウント削除をご希望の場合は contact ページからお問い合わせください。",
      },
    ],
  },
  {
    section: "企業の方",
    items: [
      {
        q: "求人掲載に費用はかかりますか？",
        a: "現在、掲載料は無料キャンペーン中です（期間中の新規掲載に限る）。採用が決定した場合のみ成果報酬（1 名あたり 49.8 万円〜・職種による）が発生します。求人の掲載数に制限はありません。",
      },
      {
        q: "求人を掲載するまでの流れを教えてください。",
        a: "「企業の方へ」ページからお問い合わせ → 担当者からご連絡 → 掲載内容ヒアリング → 公開、の流れです。最短 3 営業日で公開できます。",
      },
      {
        q: "応募者の管理機能はありますか？",
        a: "企業ダッシュボードで自社求人への応募者を一覧できます。応募者の選考状況は当社運営側で管理し、随時状況を共有します。",
      },
      {
        q: "成果報酬はいつ請求されますか？",
        a: "採用決定後、入社確認をもって請求書を発行します。マネーフォワード請求書もしくは Stripe カード決済で月末締めの翌月末払いです。",
      },
      {
        q: "求人内容の編集はできますか？",
        a: "企業ダッシュボードの「求人管理」からいつでも編集できます。求人写真や会社情報も自由に更新可能です。",
      },
    ],
  },
  {
    section: "サービス全般",
    items: [
      {
        q: "対応エリアはどこですか？",
        a: "全国 47 都道府県すべての建設業求人を扱っています。都道府県・職種ごとの専用ページから検索できます。",
      },
      {
        q: "どのような職種を扱っていますか？",
        a: "建築・躯体、土木、電気・設備、内装・仕上げ、解体・産廃、ドライバー・重機、施工管理、測量・設計の 8 つの建設業カテゴリを扱っています。",
      },
      {
        q: "運営会社はどこですか？",
        a: "株式会社 LET（大阪府大阪市中央区南久宝寺町 4-4-12 IB CENTER ビル 8F、TEL: 06-6786-8320）が運営する有料職業紹介事業（許可番号 27-ユ-304693）です。",
      },
      {
        q: "公式 SNS はありますか？",
        a: "YouTube（@let-kensetsu）と Instagram（@let_kensetsu）で建設業界の最新情報を発信しています。",
      },
    ],
  },
]

// FAQ structured data (Google Rich Result 対応)
function buildFaqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.flatMap((section) =>
      section.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      }))
    ),
  }
}

export default function FaqPage() {
  const schema = buildFaqSchema()

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero */}
      <section className="bg-primary-700 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">
            <HelpCircle className="h-8 w-8" />
            よくある質問
          </h1>
          <p className="mt-2 text-sm text-white/85">
            建設業求人サイト「ゲンバキャリア」の使い方・応募方法・料金についてのよくある質問。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* TOC */}
        <nav className="border bg-warm-50 p-4">
          <p className="text-xs font-bold text-gray-500 mb-2">目次</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {FAQ.map((s) => (
              <li key={s.section}>
                <a href={`#${slug(s.section)}`} className="text-primary-700 hover:underline">
                  {s.section}（{s.items.length}）
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {FAQ.map((section) => (
          <section key={section.section} id={slug(section.section)} className="scroll-mt-20">
            <h2 className="text-xl font-bold text-gray-900 section-bar">
              {section.section}
            </h2>
            <dl className="mt-4 space-y-3">
              {section.items.map((item) => (
                <div key={item.q} className="accent-l border bg-white p-5 pl-6">
                  <dt className="font-bold text-gray-900">
                    <span className="text-primary-600 mr-1">Q.</span>
                    {item.q}
                  </dt>
                  <dd className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {/* CTA */}
        <section className="bg-primary-50 border border-primary-200 p-6 text-center">
          <p className="text-base font-bold text-gray-900">解決しない場合は</p>
          <p className="mt-1 text-sm text-gray-600">
            お問い合わせフォームから個別にご連絡ください。
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/contact"
              className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-5 py-2.5 text-sm font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              お問い合わせ
            </Link>
            <Link
              href="/jobs"
              className="press inline-flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 px-5 py-2.5 text-sm font-bold text-gray-700"
            >
              <Search className="h-4 w-4" />
              求人を探す
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function slug(s: string): string {
  return s.replace(/\s+/g, "-").toLowerCase()
}
