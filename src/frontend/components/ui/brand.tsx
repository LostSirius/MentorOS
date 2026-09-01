"use client"

import Link from "next/link"
import Image from "next/image"
import { FC } from "react"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = () => {
  return (
    <Link
      className="block w-full max-w-lg cursor-pointer transition-opacity hover:opacity-80"
      href="/"
      aria-label="MentorOS home"
    >
      <div className="aspect-[3/2] overflow-hidden rounded-2xl bg-white p-3 dark:bg-black sm:aspect-[5/2] sm:p-4">
        <div className="flex size-full items-center justify-center gap-3 sm:gap-5">
          <Image
            src="/logo-mark.svg"
            alt=""
            width={590}
            height={455}
            priority
            className="h-[72%] w-auto object-contain"
          />
          <Image
            src="/logo-wordmark.svg"
            alt="MentorOS"
            width={820}
            height={170}
            priority
            className="h-auto w-[58%] object-contain"
          />
        </div>
      </div>
    </Link>
  )
}
