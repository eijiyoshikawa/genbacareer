import Link from "next/link"
import { AnimateOnScroll } from "@/components/animate-on-scroll"
import { ContactForm } from "@/components/contact-form"
import {
  Phone,
  Mail,
  Clock,
  MapPin,
  MessageSquare,
  HelpCircle,
  Building2,
  Users,
  FileText,
  ChevronRight,
} from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ヘルプ・お問い合わせ",
  description: "ゲンバキャリアへのお問い合わせ、よくある質問、サポート情報。",
}

const faqs = [
  {
    q: "会員登録に費用はかかりますか？",
    a: "いいえ、求職者の方は完全無料でご利用いただけます。会員登録、求人検索、応募、スカウト受信など、すべての機能を無料でお使いいただけます。",
  },
  {
    q: "企業側の求人掲載費用を教えてください。",
    a: "現在、掲載料は無料キャンペーン中です（期間中の新規掲載に限る）。採用が決まった場合のみ成果報酬（1 名あたり 29.8 万円〜）が発生します。求人の掲載数に制限はありません。",
  },
  {
    q: "応募した企業から連絡がありません。",
    a: "企業の選考状況により、返信までに1〜2週間程度かかる場合がございます。マイページの「応募一覧」からステータスをご確認いただけます。",
  },
  {
    q: "登録情報を変更・削除したい場合は？",
    a: "マイページの「プロフィール編集」から情報の変更が可能です。アカウントの削除をご希望の場合は、下記お問い合わせ先までご連絡ください。",
  },
  {
    q: "履歴書はどのような形式でアップロードできますか？",
    a: "PDF形式およびWord（.docx）形式に対応しています。ファイルサイズは10MB以下でお願いいたします。また、アプリ内で履歴書・職務経歴書を作成してPDF出力することも可能です。",
  },
  {
    q: "スカウトを受け取るにはどうすればいいですか？",
    a: "マイページの「プロフィール編集」でプロフィールを公開設定にしてください。企業の採用担当者があなたのプロフィールを閲覧し、スカウトメッセージを送信できるようになります。",
  },
]

const supportLinks = [
  {
    icon: Users,
    title: "求職者の方",
    description: "会員登録・求人検索・応募に関するお問い合わせ",
    links: [
      { label: "会員登録", href: "/register" },
      { label: "求人検索", href: "/jobs" },
      { label: "マイページ", href: "/mypage" },
    ],
  },
  {
    icon: Building2,
    title: "企業の方",
    description: "求人掲載・スカウト・課金に関するお問い合わせ",
    links: [
      { label: "掲載について", href: "/for-employers" },
      { label: "企業登録", href: "/company/register" },
    ],
  },
  {
    icon: FileText,
    title: "その他",
    description: "規約・プライバシー・メディア掲載に関するお問い合わせ",
    links: [
      { label: "利用規約", href: "/terms" },
      { label: "プライバシーポリシー", href: "/privacy" },
      { label: "サイトについて", href: "/about" },
    ],
  },
]

export default function ContactPage() {
  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <HelpCircle className="h-7 w-7" />
            ヘルプ・お問い合わせ
          </h1>
          <p className="mt-2 text-primary-200">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>

        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Contact info cards */}
        <AnimateOnScroll animation="stagger">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="hover-lift  border bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center  bg-primary-100">
              <Phone className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="mt-3 font-bold text-gray-900">お電話</h3>
            <p className="mt-1 text-lg font-bold text-primary-600">06-6786-8320</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              平日 10:00〜19:00（土日祝除く）
            </div>
          </div>

          <div className="hover-lift  border bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center  bg-primary-100">
              <Mail className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="mt-3 font-bold text-gray-900">メール</h3>
            <p className="mt-1 text-sm text-primary-600">info@let-inc.net</p>
            <p className="mt-2 text-xs text-gray-500">
              通常1〜2営業日以内にご返信いたします。
            </p>
          </div>

          <div className="hover-lift  border bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center  bg-primary-100">
              <MapPin className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="mt-3 font-bold text-gray-900">所在地</h3>
            <p className="mt-1 text-sm text-gray-700">
              大阪府大阪市中央区南久宝寺町
              <br />
              4-4-12 IB CENTERビル8F
            </p>
            <p className="mt-2 text-xs text-gray-500">株式会社LET</p>
          </div>
        </div>
        </AnimateOnScroll>

        {/* Support categories */}
        <AnimateOnScroll>
        <h2 className="mt-12 flex items-center gap-2 text-xl font-bold text-gray-900">
          <MessageSquare className="h-5 w-5 text-primary-600" />
          サポート情報
        </h2>
        </AnimateOnScroll>
        <AnimateOnScroll animation="stagger">
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {supportLinks.map((section) => {
            const Icon = section.icon
            return (
              <div key={section.title} className="hover-lift  border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary-600" />
                  <h3 className="font-bold text-gray-900">{section.title}</h3>
                </div>
                <p className="mt-2 text-xs text-gray-500">{section.description}</p>
                <ul className="mt-3 space-y-1.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        </AnimateOnScroll>

        {/* Contact form */}
        <AnimateOnScroll>
        <h2 className="mt-12 flex items-center gap-2 text-xl font-bold text-gray-900">
          <Mail className="h-5 w-5 text-primary-600" />
          フォームでお問い合わせ
        </h2>
        </AnimateOnScroll>
        <AnimateOnScroll animation="fade-up">
        <div className="mt-4">
          <ContactForm />
        </div>
        </AnimateOnScroll>

        {/* FAQ */}
        <AnimateOnScroll>
        <h2 className="mt-12 flex items-center gap-2 text-xl font-bold text-gray-900">
          <HelpCircle className="h-5 w-5 text-primary-600" />
          よくある質問
        </h2>
        </AnimateOnScroll>
        <AnimateOnScroll animation="stagger">
        <div className="mt-4 space-y-3">
          {faqs.map((faq) => (
            <div key={faq.q} className="hover-lift  border bg-white p-5 shadow-sm">
              <h3 className="flex items-start gap-2 font-bold text-gray-900">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-primary-600 text-xs font-bold text-white">
                  Q
                </span>
                {faq.q}
              </h3>
              <p className="mt-3 ml-7 text-sm text-gray-600 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
        </AnimateOnScroll>

        {/* CTA */}
        <AnimateOnScroll animation="fade-up">
        <div className="mt-12  bg-primary-50 border border-primary-100 p-8 text-center">
          <h3 className="text-lg font-bold text-gray-900">
            解決しない場合は
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            上記で解決しない場合は、お電話またはメールにてお気軽にお問い合わせください。
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="tel:06-6786-8320"
              className="inline-flex items-center justify-center gap-2  bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700 transition"
            >
              <Phone className="h-4 w-4" />
              06-6786-8320
            </a>
            <a
              href="mailto:info@let-inc.net"
              className="inline-flex items-center justify-center gap-2  border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <Mail className="h-4 w-4" />
              メールで問い合わせ
            </a>
          </div>
        </div>
        </AnimateOnScroll>
      </div>
    </div>
  )
}
