import { getHwMeta } from "@/lib/jobs-api"
import { runProxy } from "@/lib/jobs-api/proxy"

export async function GET() {
  return runProxy(() => getHwMeta(), {
    cache: { sMaxAge: 3_600, swr: 7_200 },
  })
}
