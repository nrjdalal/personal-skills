#!/usr/bin/env bun
/**
 * Send one email as a domain alias, through a send Worker (preferred) or the REST API.
 *
 * Run: bun scripts/send.ts --to a@x.com --subject "Hi" --text "Body"
 *      (or node scripts/send.ts on Node 22.18+, which strips types natively)
 *
 * Worker mode (MAIL_WORKER_URL set): POSTs to <url>/send with Bearer EMAIL_SENDING.
 *   The Worker builds `from` from its DOMAIN and CCs its INBOX var itself.
 * REST mode (otherwise): CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID; the script CCs MAIL_INBOX.
 * Both: MAIL_FROM (alias@yourdomain.com), MAIL_FROM_NAME (optional).
 * Prints the response with the message id. Never prints a token. Exits 1 on failure.
 */
import { parseArgs } from "node:util"

const { values: a } = parseArgs({
  options: {
    to: { type: "string" },
    subject: { type: "string" },
    text: { type: "string" },
    html: { type: "string" },
    cc: { type: "string", default: "" },
    "in-reply-to": { type: "string" },
    references: { type: "string" },
  },
})
if (!a.to || !a.subject || !(a.text || a.html)) {
  console.error(
    "usage: send.ts --to <addr[,addr]> --subject <s> --text <body> [--html] [--cc] [--in-reply-to] [--references]",
  )
  process.exit(2)
}

const env = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`missing env ${k}`)
  return v
}
const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
const one = (xs: string[]) => (xs.length > 1 ? xs : xs[0])

const to = list(a.to)
const cc = list(a.cc ?? "")
const headers: Record<string, string> = {}
if (a["in-reply-to"]) headers["In-Reply-To"] = a["in-reply-to"]
if (a.references) headers["References"] = a.references
const extras = {
  ...(a.text && { text: a.text }),
  ...(a.html && { html: a.html }),
  ...(Object.keys(headers).length && { headers }),
}
const from = env("MAIL_FROM")
const fromName = process.env.MAIL_FROM_NAME

const worker = process.env.MAIL_WORKER_URL
let ok: boolean
let out: unknown

if (worker) {
  const res = await fetch(`${worker.replace(/\/$/, "")}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("EMAIL_SENDING")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to: one(to),
      from_alias: from.split("@")[0],
      ...(fromName && { from_name: fromName }),
      subject: a.subject,
      ...(cc.length && { cc: one(cc) }),
      ...extras,
    }),
  })
  out = await res.json()
  ok = res.ok
} else {
  const inbox = process.env.MAIL_INBOX
  if (inbox && ![...to, ...cc].some((x) => x.toLowerCase() === inbox.toLowerCase())) cc.push(inbox)
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/email/sending/send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env("CLOUDFLARE_API_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { address: from, name: fromName ?? "" },
        to: one(to),
        subject: a.subject,
        ...(cc.length && { cc }),
        ...extras,
      }),
    },
  )
  const d = (await res.json()) as { success: boolean; errors: unknown; result: unknown }
  out = { success: d.success, errors: d.errors, result: d.result }
  ok = d.success
}

console.log(JSON.stringify(out, null, 2))
process.exit(ok ? 0 : 1)
