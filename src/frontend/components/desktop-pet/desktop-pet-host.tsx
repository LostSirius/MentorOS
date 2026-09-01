"use client"

import dynamic from "next/dynamic"

const DesktopPetLayer = dynamic(
  () =>
    import("@/components/desktop-pet/desktop-pet-layer").then(
      m => m.DesktopPetLayer
    ),
  { ssr: false }
)

/** Client-only host so pet chunks stay out of the root RSC graph. */
export function DesktopPetHost() {
  return <DesktopPetLayer />
}
