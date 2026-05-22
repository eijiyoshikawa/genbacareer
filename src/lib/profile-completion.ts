/**
 * 求職者プロフィール完了率の算出ロジック。
 *
 * 重み付き 8 項目から 0〜100% を算出。各項目は uniform で点数を持つ。
 * 履歴書アップロード（resumeUrl）は +25%、その他は +10〜15%。
 */

export type ProfileSnapshot = {
  name: string | null
  email: string | null
  phone: string | null
  prefecture: string | null
  city: string | null
  birthDate: Date | null
  desiredCategories: string[]
  desiredSalaryMin: number | null
  resumeUrl: string | null
  emailVerified: Date | null
}

export type CompletionItem = {
  key: string
  label: string
  done: boolean
  weight: number
}

export function calcProfileCompletion(p: ProfileSnapshot): {
  percent: number
  items: CompletionItem[]
} {
  const items: CompletionItem[] = [
    { key: "name", label: "氏名", done: !!p.name?.trim(), weight: 10 },
    { key: "email", label: "メールアドレス", done: !!p.email, weight: 5 },
    {
      key: "emailVerified",
      label: "メール認証",
      done: !!p.emailVerified,
      weight: 10,
    },
    { key: "phone", label: "電話番号", done: !!p.phone?.trim(), weight: 10 },
    {
      key: "prefecture",
      label: "お住まいの地域（都道府県）",
      done: !!p.prefecture,
      weight: 5,
    },
    { key: "city", label: "市区町村", done: !!p.city?.trim(), weight: 5 },
    {
      key: "birthDate",
      label: "生年月日",
      done: !!p.birthDate,
      weight: 5,
    },
    {
      key: "desiredCategories",
      label: "希望職種",
      done: (p.desiredCategories ?? []).length > 0,
      weight: 10,
    },
    {
      key: "desiredSalaryMin",
      label: "希望給与",
      done: !!p.desiredSalaryMin && p.desiredSalaryMin > 0,
      weight: 5,
    },
    {
      key: "resumeUrl",
      label: "履歴書 / 職務経歴書",
      done: !!p.resumeUrl,
      weight: 35,
    },
  ]
  const total = items.reduce((s, it) => s + it.weight, 0)
  const done = items.reduce((s, it) => s + (it.done ? it.weight : 0), 0)
  const percent = Math.min(100, Math.round((done / total) * 100))
  return { percent, items }
}
