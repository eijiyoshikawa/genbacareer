"use client"

import { ReactNode } from "react"

export function StopPropagationWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
    >
      {children}
    </div>
  )
}
