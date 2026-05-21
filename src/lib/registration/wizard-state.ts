"use client"

import { z } from "zod"

/**
 * ウィザードの回答を sessionStorage に保存するヘルパ。
 *
 * - サーバへの POST は最終ステップ (or 完了画面) でまとめて 1 回
 * - 途中離脱しても再開できるよう sessionStorage に都度書き込み
 * - 同一タブ内でのみ有効 (タブ閉じたら破棄) — 個人情報を持ち越さない方針
 * - 旧スキーマの残骸で型不整合が起きないよう、読み出し時に Zod で safeParse する
 */

export type WizardAnswers = {
  // Step 1: 住まい
  prefecture?: string
  city?: string

  // Step 2: 経験
  /** 上位カテゴリ (建設業 9 カテゴリ) — 複数選択 */
  experiencedCategories?: string[]
  /** 細分職種スラッグ — 複数選択 */
  experiencedSubcategories?: string[]
  /** 経験年数 ('none' | 'lt1' | '1to3' | ... ) */
  experienceYears?: string
  /** 経験社数 ('0' | '1' | '2' | '3' | '4-5' | 'gt6') */
  companyCount?: string

  // Step 3: 希望条件
  desiredPrefectures?: string[]
  desiredSalaryMin?: number
  desiredTransferTiming?: string

  // Step 4: 本人情報
  nameLast?: string
  nameFirst?: string
  nameLastKana?: string
  nameFirstKana?: string
  phone?: string

  // Step 5: 現職 (任意)
  currentStatus?: string
  currentSalary?: number
  managementExperience?: string

  // Step 6: 資格 (任意)
  licenses?: string[]
  hasDriverLicense?: boolean

  // Step 7: 学歴 (任意)
  finalEducation?: string
  graduationStatus?: string

  // Step 8: こだわり条件 (任意)
  preferredCompanyFeatures?: string[]
  preferredJobFeatures?: string[]

  // 入口で受け取る (必須、ステップ前)
  email?: string
}

const STORAGE_KEY = "genba-registration-wizard"

// すべて optional の緩いスキーマ。旧スキーマが残っていても落ちないよう passthrough。
const wizardAnswersStoredSchema = z
  .object({
    prefecture: z.string().optional(),
    city: z.string().optional(),
    experiencedCategories: z.array(z.string()).optional(),
    experiencedSubcategories: z.array(z.string()).optional(),
    experienceYears: z.string().optional(),
    companyCount: z.string().optional(),
    desiredPrefectures: z.array(z.string()).optional(),
    desiredSalaryMin: z.number().optional(),
    desiredTransferTiming: z.string().optional(),
    nameLast: z.string().optional(),
    nameFirst: z.string().optional(),
    nameLastKana: z.string().optional(),
    nameFirstKana: z.string().optional(),
    phone: z.string().optional(),
    currentStatus: z.string().optional(),
    currentSalary: z.number().optional(),
    managementExperience: z.string().optional(),
    licenses: z.array(z.string()).optional(),
    hasDriverLicense: z.boolean().optional(),
    finalEducation: z.string().optional(),
    graduationStatus: z.string().optional(),
    preferredCompanyFeatures: z.array(z.string()).optional(),
    preferredJobFeatures: z.array(z.string()).optional(),
    email: z.string().optional(),
  })
  .passthrough()

export function loadAnswers(): WizardAnswers {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = wizardAnswersStoredSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      // 旧フォーマット等で破損していたら捨てて最初から
      window.sessionStorage.removeItem(STORAGE_KEY)
      return {}
    }
    return parsed.data as WizardAnswers
  } catch {
    return {}
  }
}

export function saveAnswers(patch: Partial<WizardAnswers>) {
  if (typeof window === "undefined") return
  const current = loadAnswers()
  const merged = { ...current, ...patch }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // QuotaExceeded 等は無視 (ウィザードは続行可能)
  }
}

export function clearAnswers() {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 無視
  }
}
