import Link from "next/link"
import type { Metadata } from "next"
import {
  CheckCircle,
  ShieldCheck,
  Books,
  Handshake,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr"
import { generateBreadcrumbSchema, jsonLdScript } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: "編集ポリシー",
  description:
    "ゲンバキャリアの編集ポリシー。記事の品質基準、出典の扱い、利益相反の管理、専門家による監修体制、修正・更新フローについて公開しています。建設業界の求職者・採用担当者の方が安心して情報を利用できるよう、透明性を担保しています。",
  alternates: { canonical: "/editorial-policy" },
}

export default function EditorialPolicyPage() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: "トップ", url: "/" },
    { name: "編集ポリシー", url: "/editorial-policy" },
  ])

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />

      <header className="border-b bg-warm-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-xs font-bold text-primary-600">EDITORIAL POLICY</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
            編集ポリシー
          </h1>
          <p className="mt-3 text-sm text-gray-700 leading-relaxed">
            ゲンバキャリア (運営: 株式会社 LET) は、建設業界の求人情報および
            関連コンテンツを発信するメディアです。求職者と採用担当者の双方が
            安心して情報を利用できるよう、以下の編集ポリシーに基づいて
            記事を作成・公開しています。
          </p>
          <p className="mt-2 text-xs text-gray-500">
            最終更新日: 2026 年 5 月 20 日
          </p>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* 1. ミッション */}
        <Section
          icon={
            <Handshake
              weight="duotone"
              className="h-6 w-6 text-primary-500"
            />
          }
          title="1. ミッション"
        >
          <p>
            ゲンバキャリアは「建設業界で働きたい人と、人を必要としている
            企業を、誇張のないファクトベースの情報でつなぐ」ことを
            ミッションとしています。建設業界の慢性的な人手不足を解消し、
            ノンデスク産業の魅力と可能性を正しく伝えることを目指しています。
          </p>
        </Section>

        {/* 2. 編集方針 */}
        <Section
          icon={
            <CheckCircle
              weight="duotone"
              className="h-6 w-6 text-emerald-600"
            />
          }
          title="2. 編集方針"
        >
          <ul className="space-y-3">
            <PolicyItem
              title="一次情報の重視"
              body="記事は可能な限り一次情報 (公的統計・現場での実務経験・取材) に基づいて執筆します。"
            />
            <PolicyItem
              title="出典の明示"
              body="統計・調査結果を引用する際は、出典元 (政府機関・業界団体・公開レポート等) を本文中に明記します。"
            />
            <PolicyItem
              title="誇張表現の禁止"
              body="「絶対」「必ず」「最高」など、根拠のない断定や煽る表現は使用しません。年収・労働環境などのレンジは実態に即した数値で表現します。"
            />
            <PolicyItem
              title="多様な視点"
              body="求職者の視点だけでなく、採用企業・行政・業界団体の立場からも情報をバランス良く扱います。"
            />
          </ul>
        </Section>

        {/* 3. 執筆・監修体制 */}
        <Section
          icon={<Books weight="duotone" className="h-6 w-6 text-amber-600" />}
          title="3. 執筆・監修体制"
        >
          <p>
            記事は{" "}
            <Link
              href="/authors"
              className="text-primary-600 underline underline-offset-2 hover:no-underline"
            >
              編集部・著者
            </Link>{" "}
            のうち建設業界での実務経験 8 年以上のメンバーが執筆します。
            業界専門知識を要する記事 (資格・法令・施工管理など) は、
            該当領域の有資格者 (一級施工管理技士・一級建築士・キャリア
            コンサルタント等) が監修し、内容の正確性を担保します。
          </p>
          <p className="mt-3 text-sm text-gray-600">
            すべての記事は公開前に編集部内で複数名がレビューし、
            ファクトチェック・誤字脱字確認・リンク先の存在確認を行います。
          </p>
        </Section>

        {/* 4. 修正・更新ポリシー */}
        <Section
          icon={
            <ShieldCheck
              weight="duotone"
              className="h-6 w-6 text-blue-600"
            />
          }
          title="4. 修正・更新ポリシー"
        >
          <ul className="space-y-3">
            <PolicyItem
              title="誤りの訂正"
              body="記事に誤りが見つかった場合は、24 時間以内に確認・訂正し、訂正内容を記事末に明示します。"
            />
            <PolicyItem
              title="情報の更新"
              body="法改正・統計の更新等で記載内容が古くなった場合は、定期的に見直して最新情報に反映します。最終更新日は記事ヘッダーに明示します。"
            />
            <PolicyItem
              title="削除"
              body="重大な誤りや、もはや関連性が無くなった記事は削除する場合があります。削除後の URL はリダイレクトまたは 410 Gone を返します。"
            />
          </ul>
        </Section>

        {/* 5. 利益相反 (COI) の管理 */}
        <Section
          icon={
            <ShieldCheck
              weight="duotone"
              className="h-6 w-6 text-rose-600"
            />
          }
          title="5. 利益相反 (COI) の管理"
        >
          <p>
            広告・記事広告 (タイアップ) を掲載する場合は、本文中およびページ
            上部に「PR」「広告」「タイアップ」のラベルを明示します。
            掲載企業からの依頼の有無にかかわらず、編集内容はゲンバキャリア
            編集部の独立した判断で決定します。
          </p>
          <p className="mt-3 text-sm text-gray-600">
            求人情報の掲載順序・推奨は、ユーザーの検索条件・行動履歴に
            基づくアルゴリズムで決定し、企業から金銭の対価を受け取って
            掲載順を変えることはありません。
          </p>
        </Section>

        {/* 6. お問い合わせ */}
        <Section
          icon={
            <Handshake
              weight="duotone"
              className="h-6 w-6 text-primary-500"
            />
          }
          title="6. お問い合わせ"
        >
          <p>
            記事内容に関するご指摘・修正依頼・取材のお申し込みは、
            お問い合わせフォームよりご連絡ください。
          </p>
          <Link
            href="/contact"
            className="press mt-4 inline-flex items-center gap-1.5 bg-primary-600 px-5 py-2.5 text-sm font-extrabold text-white shadow hover:bg-primary-700"
          >
            お問い合わせフォームへ
            <ArrowRight weight="bold" className="h-4 w-4" />
          </Link>
        </Section>
      </article>

      <section className="border-t bg-warm-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-xs text-gray-500">
            運営: 株式会社 LET ・ お問い合わせ:{" "}
            <a
              href="mailto:info@let-inc.net"
              className="text-primary-600 hover:underline"
            >
              info@let-inc.net
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
        {icon}
        {title}
      </h2>
      <div className="mt-3 text-sm sm:text-[15px] text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function PolicyItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="border-l-2 border-primary-300 pl-3">
      <p className="font-bold text-gray-900">{title}</p>
      <p className="mt-0.5 text-sm text-gray-700">{body}</p>
    </li>
  )
}
