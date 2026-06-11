/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface NewMessageProps {
  senderName?: string
  listingTitle?: string
  messagePreview?: string
  threadUrl?: string
  siteName?: string
}

const NewMessageEmail = ({
  senderName = 'Un acheteur',
  listingTitle = 'votre annonce',
  messagePreview = '',
  threadUrl = 'https://www.toutsuiteannonces.com/dashboard',
  siteName = 'toutsuiteannonces',
}: NewMessageProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{senderName} vous a envoyé un message à propos de {listingTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>💬 Nouveau message</Heading>
        <Text style={text}>
          <strong>{senderName}</strong> vous a écrit au sujet de votre annonce
          {' '}« <strong>{listingTitle}</strong> ».
        </Text>
        {messagePreview ? (
          <Section style={quote}>
            <Text style={quoteText}>« {messagePreview} »</Text>
          </Section>
        ) : null}
        <Button style={button} href={threadUrl}>
          Voir la conversation
        </Button>
        <Text style={footer}>
          Répondez rapidement pour ne pas manquer l'opportunité.
          <br />— L'équipe {siteName}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewMessageEmail,
  subject: (data: Record<string, unknown>) =>
    `💬 Nouveau message de ${(data.senderName as string) || 'un acheteur'}`,
  displayName: 'Nouveau message',
  previewData: {
    senderName: 'Talla',
    listingTitle: 'iPhone 14 Pro - 256 Go',
    messagePreview: 'Bonjour, est-ce toujours disponible ?',
    threadUrl: 'https://www.toutsuiteannonces.com/dashboard',
    siteName: 'toutsuiteannonces',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3f3f46', lineHeight: '1.6', margin: '0 0 20px' }
const quote = {
  borderLeft: '4px solid #e0a82e',
  backgroundColor: '#fbf6e9',
  padding: '12px 16px',
  borderRadius: '8px',
  margin: '0 0 24px',
}
const quoteText = { fontSize: '14px', color: '#3f3f46', lineHeight: '1.6', margin: 0, fontStyle: 'italic' as const }
const button = {
  backgroundColor: '#e0a82e',
  color: '#0a0a0a',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#a1a1aa', margin: '32px 0 0', lineHeight: '1.5' }
