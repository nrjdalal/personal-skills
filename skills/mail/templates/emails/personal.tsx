import { Body, Container, Head, Html, Link, Preview, Section, Text } from "@react-email/components"

export type PersonalLink = {
  label: string
  href: string
}

export type PersonalProps = {
  /** Inbox preview line; defaults to the first paragraph. */
  preview?: string
  greeting?: string
  /** Paragraphs separated by a blank line. */
  body: string
  signoff?: string
  name: string
  /** One quiet line under the name, e.g. a role or site. */
  tagline?: string
  links?: PersonalLink[]
}

const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const para = {
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#18181b",
}

const muted = {
  margin: "0",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#71717a",
}

const paragraphsOf = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

/** Plain-text copy laid out like the HTML: blank line between paragraphs, signature lines tight. */
export function text({ greeting, body, signoff = "Thanks,", name, tagline, links = [] }: PersonalProps) {
  const blocks = [...(greeting ? [greeting] : []), ...paragraphsOf(body)]
  const signature = [signoff, name, ...(tagline ? [tagline] : []), ...links.map((l) => `${l.label}: ${l.href}`)]
  return [...blocks, signature.join("\n")].join("\n\n") + "\n"
}

export default function Personal({
  preview,
  greeting,
  body,
  signoff = "Thanks,",
  name,
  tagline,
  links = [],
}: PersonalProps) {
  const paragraphs = paragraphsOf(body)

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview ?? paragraphs[0] ?? ""}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: "#ffffff", fontFamily: font }}>
        <Container style={{ maxWidth: "560px", padding: "0", margin: "0" }}>
          {greeting && <Text style={para}>{greeting}</Text>}
          {paragraphs.map((p, i) => (
            <Text key={i} style={{ ...para, whiteSpace: "pre-line" }}>
              {p}
            </Text>
          ))}
          <Section style={{ marginTop: "24px" }}>
            <Text style={{ ...para, margin: "0" }}>{signoff}</Text>
            <Text style={{ ...para, margin: "0", fontWeight: 600 }}>{name}</Text>
            {tagline && <Text style={muted}>{tagline}</Text>}
            {links.length > 0 && (
              <Text style={muted}>
                {links.map((l, i) => (
                  <span key={l.href}>
                    {i > 0 && " · "}
                    <Link href={l.href} style={{ color: "#4f46e5", textDecoration: "none" }}>
                      {l.label}
                    </Link>
                  </span>
                ))}
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
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
