const fs = require("fs")
const path = require("path")

const src = path.resolve(__dirname, "..", "..", "plugins")
const dst = path.resolve(__dirname, "..", "public", "plugins")

if (fs.existsSync(src)) {
  fs.rmSync(dst, { recursive: true, force: true })
  fs.cpSync(src, dst, { recursive: true })
  console.log("Copied plugins to public/plugins")
} else {
  console.log("Source plugins dir not found, skipping copy")
}
