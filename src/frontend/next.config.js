const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true"
})

const withPWA = require("next-pwa")({
  dest: "public"
})

module.exports = withBundleAnalyzer(
  withPWA({
    reactStrictMode: true,
    images: {
      remotePatterns: [
        {
          protocol: "http",
          hostname: "localhost"
        },
        {
          protocol: "http",
          hostname: "127.0.0.1"
        },
        {
          protocol: "https",
          hostname: "**"
        }
      ]
    },
    eslint: {
      ignoreDuringBuilds: true
    },
    typescript: {
      ignoreBuildErrors: true
    },
    experimental: {
      serverComponentsExternalPackages: [
        "sharp",
        "onnxruntime-node",
        "pdf-parse",
        "mammoth"
      ]
    }
  })
)
