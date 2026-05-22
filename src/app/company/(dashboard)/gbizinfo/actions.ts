"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import {
  fetchSnapshot,
  isGbizConfigured,
  isValidCorporateNumber,
} from "@/lib/gbizinfo"
import { z } from "zod"

const Input = z.object({
  corporateNumber: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "13 桁の数字で入力してください"),
})

export type GbizActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string }

/**
 * 企業管理者が法人番号を保存し、GbizINFO API から会社情報を取り込む。
 *
 * - 13 桁の法人番号バリデーション
 * - 既に他企業で使われている番号は重複拒否
 * - GbizINFO 取得結果を Company.gbizData (JSONB) にキャッシュ
 * - 取得失敗時も法人番号自体は保存（API 障害でも UI を進められるように）
 */
export async function saveCorporateNumber(
  formData: FormData
): Promise<GbizActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "ログインしてください" }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin") {
    return { ok: false, error: "権限がありません（管理者のみ操作可能）" }
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) return { ok: false, error: "企業情報が見つかりません" }

  const parsed = Input.safeParse({
    corporateNumber: formData.get("corporateNumber"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力エラー" }
  }
  const corporateNumber = parsed.data.corporateNumber

  // 重複チェック（自社以外で既に使われていないか）
  const conflict = await prisma.company.findFirst({
    where: {
      corporateNumber,
      NOT: { id: companyId },
    },
    select: { id: true },
  })
  if (conflict) {
    return {
      ok: false,
      error: "この法人番号は他企業で登録済みです。番号をご確認ください",
    }
  }

  // GbizINFO 取得（API キー未設定でも続行）
  let snapshot = null
  if (isGbizConfigured() && isValidCorporateNumber(corporateNumber)) {
    snapshot = await fetchSnapshot(corporateNumber)
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      corporateNumber,
      ...(snapshot && {
        gbizData: snapshot as unknown as object,
        gbizSyncedAt: new Date(),
      }),
    },
  })

  revalidatePath("/company/gbizinfo")
  revalidatePath(`/companies/${companyId}`)

  if (!isGbizConfigured()) {
    return {
      ok: true,
      message:
        "法人番号を保存しました。GbizINFO API キーが未設定のため、企業情報の自動取得は行っていません。",
    }
  }
  if (!snapshot) {
    return {
      ok: true,
      message:
        "法人番号を保存しましたが、GbizINFO に該当データが見つかりませんでした（時間をおいて再取得をお試しください）",
    }
  }

  return {
    ok: true,
    message: "法人番号を保存し、GbizINFO から企業情報を取り込みました",
  }
}

/** 既に保存済みの法人番号で再取得を行う（月次バッチでも使う想定） */
export async function refreshGbizData(): Promise<GbizActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "ログインしてください" }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin") {
    return { ok: false, error: "権限がありません" }
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) return { ok: false, error: "企業情報が見つかりません" }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { corporateNumber: true },
  })
  if (!company?.corporateNumber) {
    return { ok: false, error: "法人番号が未登録です。先に保存してください" }
  }

  if (!isGbizConfigured()) {
    return { ok: false, error: "GbizINFO API が未設定です" }
  }

  const snapshot = await fetchSnapshot(company.corporateNumber)
  if (!snapshot) {
    return {
      ok: false,
      error: "GbizINFO から取得できませんでした（API 障害 or データ未登録）",
    }
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      gbizData: snapshot as unknown as object,
      gbizSyncedAt: new Date(),
    },
  })

  revalidatePath("/company/gbizinfo")
  revalidatePath(`/companies/${companyId}`)

  return { ok: true, message: "GbizINFO から最新情報を再取得しました" }
}

/** 法人番号と取り込み済みデータを削除（プライバシー対応） */
export async function clearCorporateNumber(): Promise<GbizActionResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "ログインしてください" }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin") {
    return { ok: false, error: "権限がありません" }
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) return { ok: false, error: "企業情報が見つかりません" }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      corporateNumber: null,
      // Prisma の Json フィールドは null を入れるとき JsonNull リテラルが必要
      gbizData: Prisma.JsonNull,
      gbizSyncedAt: null,
    },
  })

  revalidatePath("/company/gbizinfo")
  revalidatePath(`/companies/${companyId}`)

  return { ok: true, message: "法人番号と取り込み済みデータを削除しました" }
}
