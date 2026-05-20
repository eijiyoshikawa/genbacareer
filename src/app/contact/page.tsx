import type { Metadata } from "next"
import { ContactForm } from "./contact-form"

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "現場キャリアへのお問い合わせはこちらから。",
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">お問い合わせ</h1>
      <p className="mt-2 text-sm text-gray-600">
        サービス内容・求人掲載・採用に関するご質問は下記フォームよりお問い合わせください。
        通常 2 営業日以内にご返信いたします。
      </p>
      <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm">
        <ContactForm />
      </div>
    </div>
  )
}
