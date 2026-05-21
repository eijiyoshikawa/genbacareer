"use client"

/**
 * ウィザードの回答を sessionStorage に保存するヘルパ。
 *
 * - サーバへの POST は最終ステップ (or 完了画面) でまとめて 1 回
 * - 途中離脱しても再開できるよう sessionStorage に都度書き込み
 * - 同一タブ内でのみ有効 (タブ閉じたら破棄) — 個人情報を持ち越さない方針
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

export function loadAnswers(): WizardAnswers {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as WizardAnswers
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
