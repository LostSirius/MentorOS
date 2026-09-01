import { CopilotProvider } from "@/components/copilot/copilot-provider"
import { Toaster } from "@/components/ui/sonner"
import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import "./[locale]/globals.css"

const inter = Inter({ subsets: ["latin"] })
const APP_NAME = "MentorOS"
const APP_DEFAULT_TITLE = "MentorOS"
const APP_TITLE_TEMPLATE = "%s · MentorOS"
const APP_DESCRIPTION =
  "MentorOS — academic co-supervisor with research modules and agent chat for literature, ideas, experiments, writing, figures, review, and polish."

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  other: {
    google: "notranslate"
  }
}

export const viewport: Viewport = {
  themeColor: "#000000"
}

/**
 * Root layout stays mounted across /en ↔ /zh soft-nav so GlobalState /
 * CopilotProvider (chat attachments, research session) survive locale switches.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="notranslate" translate="no" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className={`${inter.className} notranslate`}>
        <Providers attribute="class" defaultTheme="dark">
          <Toaster richColors position="top-center" duration={3000} />
          <GlobalState>
            <CopilotProvider>
              <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
                {children}
              </div>
            </CopilotProvider>
          </GlobalState>
        </Providers>
      </body>
    </html>
  )
}
