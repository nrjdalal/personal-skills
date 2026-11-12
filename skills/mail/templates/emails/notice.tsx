import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components"

export type NoticeCard = {
  label: string
  text: string
  color: string
}

export type NoticeLink = {
  label: string
  href: string
}

export type NoticeCta = {
  label: string
  href: string
}

export type NoticeProps = {
  brand?: string
  title?: string
  subtitle?: string
  greeting?: string
  body?: string
  cards?: NoticeCard[]
  cta?: NoticeCta
  signoff?: string
  footerLinks?: NoticeLink[]
  footnote?: string
}

const indigo = "#4f46e5"
const indigoSoft = "#eef2ff"
const green = "#16a34a"
const blue = "#2563eb"
const orange = "#ea580c"
const ink = "#18181b"
const muted = "#52525b"
const line = "#e4e4e7"
const page = "#f4f4f5"
const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const defaults = {
  brand: "nrjdalal.com",
  title: "Your domain mail is live",
  subtitle: "Sent through the Cloudflare Worker, with the inbox CC'd automatically.",
  greeting: "Hi Neeraj,",
  body: "This is a React Email template for messages sent from @nrjdalal.com aliases. The Worker delivers the mail and CCs the inbox automatically, so the conversation lives in Gmail from the first message.",
  cards: [
    { label: "Sending", text: "Worker on Cloudflare Email Service", color: green },
    { label: "Routing", text: "Replies forward to your inbox", color: blue },
    { label: "Threading", text: "In-Reply-To and References", color: orange },
  ],
  cta: { label: "Visit nrjdalal.com", href: "https://nrjdalal.com" },
  signoff: "Cheers, Neeraj Dalal",
  footerLinks: [
    { label: "GitHub", href: "https://github.com/nrjdalal" },
    { label: "X", href: "https://x.com/nrjdalal" },
    { label: "LinkedIn", href: "https://linkedin.com/in/nrjdalal" },
  ],
  footnote: "Sent from a @nrjdalal.com alias through the Cloudflare Worker.",
} satisfies Required<NoticeProps>

export const Notice = ({
  brand = defaults.brand,
  title = defaults.title,
  subtitle = defaults.subtitle,
  greeting = defaults.greeting,
  body = defaults.body,
  cards = defaults.cards,
  cta = defaults.cta,
  signoff = defaults.signoff,
  footerLinks = defaults.footerLinks,
  footnote = defaults.footnote,
}: NoticeProps) => (
  <Html>
    <Head />
    <Preview>{`${title} · ${brand}`}</Preview>
    <Body style={{ backgroundColor: page, margin: 0, padding: "24px 12px", fontFamily: font }}>
      <Container
        style={{
          backgroundColor: "#ffffff",
          maxWidth: 560,
          margin: "0 auto",
          border: `1px solid ${line}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Section style={{ backgroundColor: indigo, padding: "28px 32px" }}>
          <Text
            style={{
              color: indigoSoft,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {brand}
          </Text>
          <Heading
            as="h1"
            style={{
              color: "#ffffff",
              fontSize: 26,
              lineHeight: "32px",
              fontWeight: 650,
              margin: "10px 0 0",
            }}
          >
            {title}
          </Heading>
          {subtitle ? (
            <Text style={{ color: "#c7d2fe", fontSize: 14, lineHeight: "22px", margin: "10px 0 0" }}>
              {subtitle}
            </Text>
          ) : null}
        </Section>

        <Section style={{ padding: "28px 32px 8px" }}>
          <Text style={{ color: ink, fontSize: 16, lineHeight: "24px", margin: 0 }}>{greeting}</Text>
          <Text style={{ color: muted, fontSize: 15, lineHeight: "24px", margin: "12px 0 0" }}>{body}</Text>
        </Section>

        {cards.length ? (
          <Section style={{ padding: "20px 26px 8px" }}>
            <Row>
              {cards.map((card, i) => (
                <Column
                  key={`${card.label}-${i}`}
                  style={{
                    width: `${100 / cards.length}%`,
                    padding: "0 6px",
                    verticalAlign: "top",
                  }}
                >
                  <Section
                    style={{
                      border: `1px solid ${line}`,
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <Text
                      style={{
                        backgroundColor: card.color,
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        margin: 0,
                        padding: "8px 10px",
                      }}
                    >
                      {card.label}
                    </Text>
                    <Text
                      style={{
                        color: ink,
                        fontSize: 13,
                        lineHeight: "18px",
                        margin: 0,
                        padding: "10px",
                      }}
                    >
                      {card.text}
                    </Text>
                  </Section>
                </Column>
              ))}
            </Row>
          </Section>
        ) : null}

        {cta ? (
          <Section style={{ padding: "24px 32px 8px", textAlign: "center" }}>
            <Button
              href={cta.href}
              style={{
                backgroundColor: indigo,
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                borderRadius: 8,
                padding: "12px 22px",
                display: "inline-block",
              }}
            >
              {cta.label}
            </Button>
          </Section>
        ) : null}

        <Section style={{ padding: "16px 32px 28px" }}>
          <Text style={{ color: ink, fontSize: 15, lineHeight: "24px", whiteSpace: "pre-line", margin: 0 }}>
            {signoff}
          </Text>
        </Section>

        <Hr style={{ borderColor: line, margin: 0 }} />

        <Section style={{ padding: "16px 32px 24px" }}>
          {footerLinks.length ? (
            <Text style={{ color: muted, fontSize: 13, lineHeight: "20px", margin: 0 }}>
              {footerLinks.map((link, i) => (
                <span key={link.href}>
                  {i > 0 ? <span style={{ color: "#a1a1aa" }}> · </span> : null}
                  <Link href={link.href} style={{ color: indigo, textDecoration: "none" }}>
                    {link.label}
                  </Link>
                </span>
              ))}
            </Text>
          ) : null}
          {footnote ? (
            <Text style={{ color: "#a1a1aa", fontSize: 12, lineHeight: "18px", margin: "8px 0 0" }}>
              {footnote}
            </Text>
          ) : null}
        </Section>
      </Container>
    </Body>
  </Html>
)

Notice.PreviewProps = defaults satisfies NoticeProps

export default Notice
