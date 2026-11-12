// Raw, text-first personal email: plain tags only, no styles, tables or wrappers,
import { Fragment } from "react"
// so the mail client's own font and spacing apply, like a hand-typed message.

export type PersonalLink = {
  label: string
  href: string
}

export type PersonalProps = {
  greeting?: string
  /** Paragraphs separated by a blank line. */
  body: string
  signoff?: string
  name: string
  links?: PersonalLink[]
}

const paragraphsOf = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

/** Plain-text copy laid out like the HTML. */
export function text({ greeting, body, signoff = "Thanks,", name, links = [] }: PersonalProps) {
  const blocks = [...(greeting ? [greeting] : []), ...paragraphsOf(body)]
  const signature = [signoff, name, ...links.map((l) => `${l.label}: ${l.href}`)]
  return [...blocks, signature.join("\n")].join("\n\n") + "\n"
}

export default function Personal({ greeting, body, signoff = "Thanks,", name, links = [] }: PersonalProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        {greeting && <p>{greeting}</p>}
        {paragraphsOf(body).map((p, i) => (
          <p key={i}>
            {p.split("\n").map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
        ))}
        <p>
          {signoff}
          <br />
          {name}
          {links.length > 0 && <br />}
          {links.map((l, i) => (
            <Fragment key={l.href}>
              {i > 0 && " · "}
              <a href={l.href}>{l.label}</a>
            </Fragment>
          ))}
        </p>
      </body>
    </html>
  )
}

Personal.PreviewProps = {
  greeting: "Hi Sam,",
  body: "Thanks for the call earlier. It was great to hear how your team is thinking about developer experience.\n\nI've put together a short write-up of what we discussed, and I'm happy to walk through it whenever suits you this week.\n\nLooking forward to it.",
  signoff: "Thanks,",
  name: "Neeraj Dalal",
  links: [
    { label: "GitHub", href: "https://github.com/nrjdalal" },
    { label: "LinkedIn", href: "https://linkedin.com/in/nrjdalal" },
    { label: "Website", href: "https://zerostarter.dev/hire" },
  ],
} satisfies PersonalProps
