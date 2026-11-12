---
name: domain-mail
description: Send and reply to email as a custom-domain address (you@yourdomain.com) through Cloudflare Email Sending, with replies landing threaded in a personal Gmail inbox. Use when sending mail from a domain alias, replying to someone in an existing thread from that alias, or testing that domain mail threads correctly.
---

# Domain mail

Outgoing mail leaves through Cloudflare's Email Sending API as an address on your domain. Replies come back through Cloudflare Email Routing, which forwards the alias to a personal **inbox** (e.g. a Gmail account). The inbox is where the whole conversation lives.

Two facts drive everything below:

- **Cloudflare keeps no Sent copy.** The inbox only holds what you sent if you CC it. Every send CCs the inbox; that copy is the thread's anchor.
- **Threads are built from headers, not subjects alone.** A reply carries `In-Reply-To` (the Message-ID it answers) and `References` (every Message-ID in the chain, oldest first). Gmail groups by these plus a matching subject.

The other person does nothing special. They hit plain Reply to the alias; routing forwards it to the inbox, already threaded.

## Setup (once)

1. Domain on Cloudflare with **Email Routing** on: a rule forwarding `alias@yourdomain.com` to the inbox.
2. **Email Sending** enabled for the domain (DNS records added, sender verified).
3. An API token with **Email Sending: Edit**, stored in an env var (here `CLOUDFLARE_API_TOKEN`), plus the account ID (`CLOUDFLARE_ACCOUNT_ID`).

**Done when:** a test send to the inbox returns `success: true` and arrives. An error `10203 sending_disabled` means step 2 is incomplete at the account level.

## Send a new email

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

Or run [`scripts/send.py`](scripts/send.py). Cloudflare assigns the Message-ID and returns it in `result.message_id`; record it. A custom `Message-ID` header is rejected (`10202 email.invalid`), so let Cloudflare set it.

**Done when:** the response is `success: true`, both recipients are in `result.queued`, and the inbox shows the CC copy.

## Reply in a thread

1. Find their reply in the inbox and read its raw headers (Gmail: Show original, or the API's RAW format). Take its `Message-ID` and its `References`.
2. Send with:
   - `subject`: `Re: <original subject>` (keep the subject unchanged after `Re:`)
   - `to`: their address, `cc`: the inbox
   - `headers`: `{"In-Reply-To": "<their Message-ID>", "References": "<their References> <their Message-ID>"}`

```
python3 scripts/send.py --to them@example.com --subject "Re: Hello" \
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
