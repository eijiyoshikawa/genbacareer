import { describe, it, expect } from "vitest"
import {
  pickFromImages,
  pickDefaultJobImage,
  DEFAULT_JOB_IMAGES,
} from "@/lib/default-job-images"

const SAMPLE = Array.from({ length: 15 }, (_, i) => `https://cdn/${i + 1}.webp`)

describe("pickFromImages", () => {
  it("候補が空なら null", () => {
    expect(pickFromImages([], "any-seed")).toBeNull()
  })

  it("同じシードなら常に同じ画像（決定的）", () => {
    const a = pickFromImages(SAMPLE, "job-uuid-123")
    const b = pickFromImages(SAMPLE, "job-uuid-123")
    expect(a).toBe(b)
    expect(SAMPLE).toContain(a)
  })

  it("異なるシードは候補内に散らばる", () => {
    const picked = new Set(
      Array.from({ length: 200 }, (_, i) =>
        pickFromImages(SAMPLE, `seed-${i}`)
      )
    )
    // 200 シードあれば 15 枚のうち十分な種類が選ばれるはず
    expect(picked.size).toBeGreaterThan(5)
  })
})

describe("pickDefaultJobImage", () => {
  it("未設定なら null、設定済みなら候補のいずれかを決定的に返す", () => {
    const picked = pickDefaultJobImage("job-uuid-123")
    if (DEFAULT_JOB_IMAGES.length === 0) {
      expect(picked).toBeNull()
    } else {
      expect(DEFAULT_JOB_IMAGES).toContain(picked)
      // 決定的: 何度呼んでも同じ
      expect(pickDefaultJobImage("job-uuid-123")).toBe(picked)
    }
  })
})
