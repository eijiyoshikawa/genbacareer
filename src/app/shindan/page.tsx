import type { Metadata } from "next"
import { ShindanClient } from "@/components/shindan/shindan-client"

export const metadata: Metadata = {
  title: "建設業 適職診断 | あなたに向いている職種は？ | ゲンバキャリア",
  description:
    "8つの質問に答えるだけで、建築・土木・電気・内装・施工管理・ドライバーなど、あなたに向いている建設業の職種が分かる無料診断。結果からそのまま求人を探せます。",
  alternates: { canonical: "/shindan" },
}

export default function ShindanPage() {
  return (
    <div className="bg-warm-50">
      {/* ヒーロー */}
      <div className="relative overflow-hidden bg-brand-gradient text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-14">
          <p className="inline-flex items-center bg-white/15 px-3 py-1 text-xs font-bold">
            無料・1分でわかる
          </p>
          <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-4xl">
            建設業 適職診断
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
            かんたん8問。あなたに向いている建設業の職種を診断します。
          </p>
        </div>
      </div>

      {/* 診断本体 */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="card-elevated bg-white p-5 sm:p-8">
          <ShindanClient />
        </div>
      </div>
    </div>
  )
}
