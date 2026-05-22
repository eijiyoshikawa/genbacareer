import { prisma } from "@/lib/db"
import {
  CONSTRUCTION_CATEGORY_VALUES,
  getCategoryLabel,
} from "@/lib/categories"

export async function GET() {
  const categories = await prisma.job.groupBy({
    by: ["category"],
    where: {
      status: "active",
      category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  })

  return Response.json(
    categories.map((c) => ({
      category: c.category,
      count: c._count.id,
      label: getCategoryLabel(c.category),
    }))
  )
}
