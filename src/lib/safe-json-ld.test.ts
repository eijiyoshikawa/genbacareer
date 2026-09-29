import { describe, expect, it } from "vitest"
import { safeJsonLd } from "./safe-json-ld"

describe("safeJsonLd", () => {
  it("escapes </script> so it cannot break out of the tag", () => {
    const out = safeJsonLd({ description: "</script><script>alert(1)</script>" })
    expect(out).not.toContain("<")
    expect(JSON.parse(out).description).toBe("</script><script>alert(1)</script>")
  })
})
