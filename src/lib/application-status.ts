/**
 * 応募ステータスの状態遷移ルール。
 * 単体更新 (/api/company/applications/[id]) と一括更新
 * (/api/company/applications/bulk) の両方で共有する。
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

export function isValidStatusTransition(from: string, to: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from]
  return !!allowed && allowed.includes(to)
}

/**
 * ステータスが「offered」に遷移するタイミングで求人の給与情報を
 * Application にスナップショットする Prisma update データを返す。
 *
 * 採用確定 (hired) は必ず offered を経由する (VALID_STATUS_TRANSITIONS) ため、
 * ここで確定した値が採用確定時の成果報酬算定 (lib/billing.ts) の基準になる。
 * これにより、企業が採用確定の直前に求人の給与を一時的に下げて
 * 成果報酬 (理論年収×35%) を圧縮する操作を防ぐ。
 * offered 以外への遷移では何もしない (undefined を返す)。
 */
export async function buildOfferSalarySnapshotData(
  newStatus: string,
  jobId: string
): Promise<
  | { offerSalaryMin: number | null; offerSalaryMax: number | null; offerSalaryType: string | null }
  | undefined
> {
  if (newStatus !== "offered") return undefined
  const { prisma } = await import("./db")
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { salaryMin: true, salaryMax: true, salaryType: true },
  })
  return {
    offerSalaryMin: job?.salaryMin ?? null,
    offerSalaryMax: job?.salaryMax ?? null,
    offerSalaryType: job?.salaryType ?? null,
  }
}
