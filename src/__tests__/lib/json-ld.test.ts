import { describe, it, expect } from "vitest"
import { jsonLdString } from "@/lib/json-ld"

describe("jsonLdString", () => {
  it("escapes '</script>' so embedded free text can't break out of the script tag", () => {
    const malicious = {
      "@type": "JobPosting",
      title: '</script><script>alert(1)</script>',
    }
    const out = jsonLdString(malicious)
    expect(out).not.toContain("</script>")
    expect(out).toContain("\\u003c/script>")
  })

  it("still round-trips to the original value via JSON.parse", () => {
    const data = { a: 1, b: "x < y & y > z", nested: { c: "<b>hi</b>" } }
    const out = jsonLdString(data)
    expect(JSON.parse(out)).toEqual(data)
  })
})
