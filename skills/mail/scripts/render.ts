#!/usr/bin/env bun
/**
 * Render a React Email template to HTML (and optionally plain text).
 *
 * Run: bun scripts/render.ts <template> [--props file.json] [--out file.html] [--text]
 * Template files live in templates/emails/<template>.tsx.
 * With --out and --text, plain text is written next to the HTML as <name>.txt.
 * A template may export `text(props)` for its plain-text copy; otherwise React Email derives one.
 * Resolves React Email from templates/node_modules (run `bun i` there first).
 */
import { existsSync } from "node:fs"
import { join, parse } from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import type { ComponentType } from "react"

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    props: { type: "string" },
    out: { type: "string" },
    text: { type: "boolean", default: false },
  },
})

const name = positionals[0]?.replace(/\.tsx$/, "")
if (!name) {
  console.error("usage: render.ts <template> [--props file.json] [--out file.html] [--text]")
  process.exit(2)
}

const templatesDir = join(import.meta.dir, "../templates")
const nm = join(templatesDir, "node_modules")
const file = join(templatesDir, "emails", `${name}.tsx`)
if (!existsSync(file)) {
  console.error(`template not found: ${file}`)
  process.exit(1)
}
if (!existsSync(join(nm, "@react-email/render"))) {
  console.error("templates/node_modules is missing; run `cd templates && bun i` first")
  process.exit(1)
}

const [{ createElement }, { render }] = await Promise.all([
  import(pathToFileURL(join(nm, "react/index.js")).href),
  import(pathToFileURL(join(nm, "@react-email/render/dist/node/index.mjs")).href),
])
const mod = (await import(pathToFileURL(file).href)) as {
  default: ComponentType<Record<string, unknown>> & { PreviewProps?: Record<string, unknown> }
  /** Optional hand-written plain-text copy, so its spacing matches the HTML. */
  text?: (props: Record<string, unknown>) => string
}
const Template = mod.default
const props = a.props
  ? (JSON.parse(await Bun.file(a.props).text()) as Record<string, unknown>)
  : (Template.PreviewProps ?? {})

const element = createElement(Template, props)
const html = await render(element)

if (a.out) {
  await Bun.write(a.out, html)
  console.error(`wrote ${a.out}`)
} else {
  console.log(html)
}

if (a.text) {
  const text = mod.text ? mod.text(props) : await render(element, { plainText: true })
  if (a.out) {
    const p = parse(a.out)
    const textPath = join(p.dir, `${p.name}.txt`)
    await Bun.write(textPath, text)
    console.error(`wrote ${textPath}`)
  } else {
    console.log(text)
  }
}
