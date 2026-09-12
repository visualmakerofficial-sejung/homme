#!/usr/bin/env node
/**
 * 원본 거투스캔 CSS에서 디자인 토큰을 뽑아 src/index.css에 붙여넣을 수 있는
 * :root / .dark 블록으로 출력한다.
 *
 * 이 클론은 원본 색상값을 모른다. 저장된 HTML이 CSS를 외부 파일로 참조만 하고
 * 그 파일들은 스냅샷에 포함되지 않았기 때문이다. 로컬에 저장된
 * `거투스캔 - 경매 분석 프로그램_files/` 폴더에는 그 CSS가 들어 있으므로,
 * 이 스크립트로 값만 뽑아 교체하면 팔레트가 원본과 같아진다.
 *
 *   node scripts/extract-theme.mjs "<경로>/거투스캔 - 경매 분석 프로그램_files"
 *   node scripts/extract-theme.mjs a.css b.css
 *   node scripts/extract-theme.mjs <경로> --write     # src/index.css 직접 수정
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

/** 원본 마크업에서 실제로 쓰이는 것이 확인된 토큰. 출력 순서이기도 하다. */
const TOKENS = [
  "radius",
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
]

function collectCssFiles(inputs) {
  const files = []
  for (const input of inputs) {
    const path = resolve(input)
    let stat
    try {
      stat = statSync(path)
    } catch {
      console.error(`건너뜀 (없는 경로): ${input}`)
      continue
    }
    if (stat.isDirectory()) {
      for (const name of readdirSync(path)) {
        if (name.toLowerCase().endsWith(".css")) files.push(join(path, name))
      }
    } else {
      files.push(path)
    }
  }
  return files
}

/**
 * 셀렉터 블록을 훑어 토큰 선언을 모은다.
 * Tailwind v4 빌드 결과는 :root, html, :host, @layer 안 등 어디든 올 수 있어서
 * 블록 단위로 스캔하고 다크 여부는 셀렉터 텍스트로 판정한다.
 */
function extract(css) {
  const light = new Map()
  const dark = new Map()

  const blockRe = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = blockRe.exec(css)) !== null) {
    const selector = match[1].trim()
    const body = match[2]
    if (!body.includes("--")) continue

    const isDark = /\.dark\b|\[data-theme=["']?dark|prefers-color-scheme:\s*dark/.test(
      selector,
    )
    const isRootish = /(^|[\s,>])(:root|html|body|\*|:host)\b|\.dark\b/.test(
      selector,
    )
    if (!isRootish && !isDark) continue

    const target = isDark ? dark : light
    for (const token of TOKENS) {
      const declRe = new RegExp(`--${token}\\s*:\\s*([^;}]+)`, "g")
      let decl
      while ((decl = declRe.exec(body)) !== null) {
        target.set(token, decl[1].trim())
      }
    }
  }

  return { light, dark }
}

function renderBlock(selector, map, extra = "") {
  if (map.size === 0) return `/* ${selector}: 찾은 토큰 없음 */`
  const lines = []
  for (const token of TOKENS) {
    if (!map.has(token)) continue
    lines.push(`  --${token}: ${map.get(token)};`)
    // --radius 바로 뒤에 파생 스케일을 넣어야 읽기 자연스럽다.
    if (token === "radius" && extra) lines.push(extra.replace(/\n$/, ""))
  }
  return `${selector} {\n${lines.join("\n")}\n}`
}

const args = process.argv.slice(2)
const write = args.includes("--write")
const inputs = args.filter((a) => a !== "--write")

if (inputs.length === 0) {
  console.error(
    [
      "사용법:",
      '  node scripts/extract-theme.mjs "<경로>/거투스캔 - 경매 분석 프로그램_files"',
      "  node scripts/extract-theme.mjs a.css b.css [--write]",
    ].join("\n"),
  )
  process.exit(1)
}

const files = collectCssFiles(inputs)
if (files.length === 0) {
  console.error("CSS 파일을 찾지 못했다.")
  process.exit(1)
}

const light = new Map()
const dark = new Map()
for (const file of files) {
  const found = extract(readFileSync(file, "utf8"))
  for (const [k, v] of found.light) light.set(k, v)
  for (const [k, v] of found.dark) dark.set(k, v)
  console.error(
    `읽음: ${file}  (light ${found.light.size}개 / dark ${found.dark.size}개)`,
  )
}

const missing = TOKENS.filter((t) => !light.has(t))
if (missing.length) {
  console.error(`\n못 찾은 토큰: ${missing.join(", ")}`)
  console.error("→ 해당 항목은 src/index.css의 현재 값이 유지된다.\n")
}

const radiusScale = [
  "  --radius-sm: calc(var(--radius) - 4px);",
  "  --radius-md: calc(var(--radius) - 2px);",
  "  --radius-lg: var(--radius);",
  "  --radius-xl: calc(var(--radius) + 4px);",
  "",
].join("\n")

const output = [
  renderBlock(":root", light, light.has("radius") ? radiusScale : ""),
  "",
  renderBlock(".dark", dark),
  "",
].join("\n")

if (!write) {
  console.log(output)
  console.error("→ 위 블록을 src/index.css의 :root / .dark 자리에 붙여넣으면 된다.")
  console.error("   (--write 를 붙이면 직접 교체한다)")
  process.exit(0)
}

const cssPath = resolve(import.meta.dirname, "..", "src", "index.css")
const current = readFileSync(cssPath, "utf8")

// 블록을 통째로 갈아끼우므로, 원본에서 못 찾은 토큰은 현재 값을 살려 둔다.
// (그러지 않으면 destructive-foreground 같은 항목이 조용히 사라진다.)
const existing = extract(current)
const mergedLight = new Map([...existing.light, ...light])
const mergedDark = new Map([...existing.dark, ...dark])

const replaced = current
  .replace(
    /:root\s*\{[\s\S]*?\n\}/,
    renderBlock(":root", mergedLight, radiusScale),
  )
  .replace(/\.dark\s*\{[\s\S]*?\n\}/, renderBlock(".dark", mergedDark))

if (replaced === current) {
  console.error("src/index.css에서 :root / .dark 블록을 찾지 못했다. 수동 교체 필요.")
  process.exit(1)
}

writeFileSync(cssPath, replaced)
console.error(
  `src/index.css 교체 완료 (원본에서 가져온 값: light ${light.size}개 / dark ${dark.size}개` +
    (missing.length ? `, 나머지 ${missing.length}개는 기존 값 유지)` : ")"),
)
