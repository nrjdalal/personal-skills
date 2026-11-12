#!/usr/bin/env python3
"""Send one email through Cloudflare Email Sending.

Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, MAIL_FROM (alias@yourdomain.com),
MAIL_FROM_NAME (optional), MAIL_INBOX (address CC'd on every send).
Prints the API result (success, errors, message_id, queued). Never prints the token.
"""
import argparse, json, os, sys, urllib.error, urllib.request

p = argparse.ArgumentParser()
p.add_argument("--to", required=True, help="comma-separated")
p.add_argument("--subject", required=True)
p.add_argument("--text", required=True)
p.add_argument("--html")
p.add_argument("--cc", default="", help="extra CCs, comma-separated")
p.add_argument("--in-reply-to")
p.add_argument("--references")
a = p.parse_args()

env = os.environ
cc = [x.strip() for x in a.cc.split(",") if x.strip()]
inbox = env.get("MAIL_INBOX")
to = [x.strip() for x in a.to.split(",") if x.strip()]
if inbox and inbox not in to and inbox not in cc:
    cc.append(inbox)

body = {
    "from": {"address": env["MAIL_FROM"], "name": env.get("MAIL_FROM_NAME", "")},
    "to": to if len(to) > 1 else to[0],
    "subject": a.subject,
    "text": a.text,
}
if cc:
    body["cc"] = cc
if a.html:
    body["html"] = a.html
headers = {}
if a.in_reply_to:
    headers["In-Reply-To"] = a.in_reply_to
if a.references:
    headers["References"] = a.references
if headers:
    body["headers"] = headers

url = f"https://api.cloudflare.com/client/v4/accounts/{env['CLOUDFLARE_ACCOUNT_ID']}/email/sending/send"
req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST", headers={
    "Authorization": "Bearer " + env["CLOUDFLARE_API_TOKEN"],
    "Content-Type": "application/json",
})
try:
    raw = urllib.request.urlopen(req).read()
except urllib.error.HTTPError as e:
    raw = e.read()
d = json.loads(raw)
print(json.dumps({k: d.get(k) for k in ("success", "errors", "result")}, indent=2))
sys.exit(0 if d.get("success") else 1)
