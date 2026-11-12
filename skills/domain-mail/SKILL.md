---
name: domain-mail
description: Send and reply to email as a custom-domain address (you@yourdomain.com) through Cloudflare Email Sending, with replies landing threaded in a personal Gmail inbox. Use when sending mail from a domain alias, replying to someone in an existing thread from that alias, or testing that domain mail threads correctly.
---

# Domain mail

Outgoing mail leaves through Cloudflare Email Sending as an address on your domain, by default through a small send Worker ([cloudflare-email-sending](https://github.com/nrjdalal/cloudflare-email-sending)) that CCs the inbox for you; the raw REST API is the fallback. Replies come back through Cloudflare Email Routing, which forwards the alias to a personal **inbox** (e.g. a Gmail account). The inbox is where the whole conversation lives.

Two facts drive everything below:

- **Cloudflare keeps no Sent copy.** The inbox only holds what you sent if you CC it. Every send CCs the inbox; that copy is the thread's anchor. The Worker does this itself from its `INBOX` var; on the REST path you add the CC.
- **Threads are built from headers, not subjects alone.** A reply carries `In-Reply-To` (the Message-ID it answers) and `References` (every Message-ID in the chain, oldest first). Gmail groups by these plus a matching subject.

The other person does nothing special. They hit plain Reply to the alias; routing forwards it to the inbox, already threaded.

## Setup (once)

1. Domain on Cloudflare with **Email Routing** on: a rule forwarding `alias@yourdomain.com` to the inbox.
2. **Email Sending** enabled for the domain (DNS records added, sender verified).
3. Deploy the send Worker: in its repo set `DOMAIN` and `INBOX` in `wrangler.jsonc`, set the bearer secret with `wrangler secret put EMAIL_SENDING`, then `bun run deploy` (needs `wrangler login`, or a `CLOUDFLARE_API_TOKEN` with Workers Scripts: Edit). Store its URL in `MAIL_WORKER_URL` and the secret in `EMAIL_SENDING`.
4. REST fallback only: an API token with **Email Sending: Edit** in `CLOUDFLARE_API_TOKEN`, plus `CLOUDFLARE_ACCOUNT_ID`.

**Done when:** a test send with no `cc` returns a `messageId` and the inbox gets the CC copy. An error `10203 sending_disabled` means step 2 is incomplete at the account level.

## Send a new email

Run [`scripts/send.ts`](scripts/send.ts) (Bun, or Node 22.18+). With `MAIL_WORKER_URL` set it uses the Worker; otherwise it calls REST and CCs `MAIL_INBOX` itself.

```
bun scripts/send.ts --to them@example.com --subject "Hello" --text "Body"
```

Worker request, if calling it directly:

```
POST $MAIL_WORKER_URL/send
Authorization: Bearer $EMAIL_SENDING
Content-Type: application/json

{"to": "them@example.com", "from_alias": "alias", "from_name": "Your Name", "subject": "Hello", "text": "Body"}
```

It takes `to`/`cc`/`bcc` (at most 50 in total, the inbox CC included), `text` or `html`, `reply_to`, `headers`, and base64 `attachments` (at most 32), and returns `data.messageId`. Errors come back as `error.code`: `UNAUTHORIZED`, `VALIDATION_ERROR`, `SEND_FAILED`.

REST fallback:

```
POST https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/email/sending/send
Authorization: Bearer $CLOUDFLARE_API_TOKEN
Content-Type: application/json

{
  "from": {"address": "alias@yourdomain.com", "name": "Your Name"},
  "to": "them@example.com",
  "cc": ["inbox@gmail.com"],
  "subject": "Hello",
  "text": "Body"
}
```

Cloudflare assigns the Message-ID (Worker: `data.messageId`, REST: `result.message_id`); record it. A custom `Message-ID` header is rejected (`10202 email.invalid`), so let Cloudflare set it.

**Done when:** the response carries a message id and the inbox shows the CC copy.

## Reply in a thread

1. Find their reply in the inbox and read its raw headers (Gmail: Show original, or the API's RAW format). Take its `Message-ID` and its `References`.
2. Send with:
   - `subject`: `Re: <original subject>` (keep the subject unchanged after `Re:`)
   - `to`: their address (the inbox CC is automatic)
   - `headers`: `{"In-Reply-To": "<their Message-ID>", "References": "<their References> <their Message-ID>"}`

```
bun scripts/send.ts --to them@example.com --subject "Re: Hello" \
  --text "Thanks!" --in-reply-to "<their-id@mail.gmail.com>" \
  --references "<first-id@yourdomain.com> <their-id@mail.gmail.com>"
```

**Done when:** the inbox shows your reply inside the same conversation as the earlier messages (same Gmail thread id).

## Verify a setup (thread drill)

Run this once after setup or any routing change. Number each body ("Step 1 of 3") and list its headers in the body, so the thread documents itself.

1. Send a new email from the alias to a second address you control, CC the inbox.
2. From that second address, plain Reply to the alias only, no CC.
3. Reply from the alias with the threading headers, CC the inbox.

**Done when:** all three messages sit in one thread in the inbox, and step 2's raw headers show `X-Forwarded-For: <alias> <inbox>` (proof it arrived by routing, not by CC).

## Gotchas

- Send the test reply from a different account than the inbox: Gmail hides a message forwarded back to the account that sent it, so routing looks broken when it works.
- Before re-running a drill, use a fresh subject. Gmail attaches a new message to a trashed thread with the same subject, which muddles the result.
- Keep the token out of logs and output; read it from the env var only.
