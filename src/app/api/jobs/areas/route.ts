import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"

export async function GET() {
  const areas = await prisma.job.groupBy({
    by: ["prefecture"],
    where: {
      status: "active",
      category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  })

  return Response.json(
    areas.map((a) => ({
      prefecture: a.prefecture,
      count: a._count.id,
    }))
  )
}
