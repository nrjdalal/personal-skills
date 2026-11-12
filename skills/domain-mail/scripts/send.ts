#!/usr/bin/env bun
/**
 * Send one email through Cloudflare Email Sending.
 *
 * Run: bun scripts/send.ts --to a@x.com --subject "Hi" --text "Body"
 *      (or node scripts/send.ts on Node 22.18+, which strips types natively)
 *
 * Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, MAIL_FROM (alias@yourdomain.com),
 *      MAIL_FROM_NAME (optional), MAIL_INBOX (CC'd on every send).
 * Prints success, errors, and result (message_id, queued). Never prints the token.
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
if (!a.to || !a.subject || !a.text) {
  console.error("usage: send.ts --to <addr[,addr]> --subject <s> --text <body> [--html] [--cc] [--in-reply-to] [--references]")
  process.exit(2)
}

const env = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`missing env ${k}`)
  return v
}
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean)

const to = list(a.to)
const cc = list(a.cc ?? "")
const inbox = process.env.MAIL_INBOX
if (inbox && !to.includes(inbox) && !cc.includes(inbox)) cc.push(inbox)

const headers: Record<string, string> = {}
if (a["in-reply-to"]) headers["In-Reply-To"] = a["in-reply-to"]
if (a.references) headers["References"] = a.references

const body = {
  from: { address: env("MAIL_FROM"), name: process.env.MAIL_FROM_NAME ?? "" },
  to: to.length > 1 ? to : to[0],
  subject: a.subject,
  text: a.text,
  ...(a.html && { html: a.html }),
  ...(cc.length && { cc }),
  ...(Object.keys(headers).length && { headers }),
}

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/email/sending/send`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${env("CLOUDFLARE_API_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  },
)
const d = (await res.json()) as { success: boolean; errors: unknown; result: unknown }
console.log(JSON.stringify({ success: d.success, errors: d.errors, result: d.result }, null, 2))
process.exit(d.success ? 0 : 1)
