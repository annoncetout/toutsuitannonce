/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  recipientName?: string
  outcome: 'approved' | 'rejected'
  offerLabel: string
  amount: number | string
  currency?: string
  reference?: string
  paymentMethod?: string
  activationLabel?: string
  dashboardUrl?: string
}

const FALLBACK_URL = 'https://www.toutsuiteannonces.com/dashboard'

const PaymentStatusEmail = ({
  recipientName,
  outcome,
  offerLabel,
  amount,
  currency = 'FCFA',
  reference,
  paymentMethod,
  activationLabel,
  dashboardUrl = FALLBACK_URL,
}: Props) => {
  const approved = outcome === 'approved'
  const title = approved ? 'Paiement validé ✅' : 'Paiement refusé ❌'
  const status = approved ? (activationLabel ?? 'Pro actif') : 'Refusé'
  const intro = approved
    ? `Bonne nouvelle ${recipientName ?? ''} ! Votre paiement a été confirmé par notre équipe.`
    : `Bonjour ${recipientName ?? ''}, votre paiement n'a pas pu être validé.`

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{title} — {offerLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>{intro}</Text>

          <Section style={card}>
            <Text style={cardLabel}>Offre</Text>
            <Text style={cardValue}>{offerLabel}</Text>

            <Hr style={hr} />

            <Text style={cardLabel}>Montant</Text>
            <Text style={cardValueBig}>{amount} {currency}</Text>

            {paymentMethod && (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Méthode</Text>
                <Text style={cardValue}>{paymentMethod}</Text>
              </>
            )}

            {reference && (
              <>
                <Hr style={hr} />
                <Text style={cardLabel}>Référence</Text>
                <Text style={cardMono}>{reference}</Text>
              </>
            )}

            <Hr style={hr} />
            <Text style={cardLabel}>Statut</Text>
            <Text style={approved ? cardStatusOk : cardStatusKo}>{status}</Text>
          </Section>

          {approved ? (
            <Text style={text}>
              Votre {activationLabel ?? 'avantage'} est désormais actif. Vous pouvez gérer vos annonces et profiter des fonctionnalités payantes depuis votre tableau de bord.
            </Text>
          ) : (
            <Text style={text}>
              Si vous pensez qu'il s'agit d'une erreur, vous pouvez relancer le paiement ou nous contacter avec la référence ci-dessus.
            </Text>
          )}

          <Button style={approved ? buttonGold : buttonDark} href={dashboardUrl}>
            {approved ? 'Accéder à mon compte' : 'Voir mes paiements'}
          </Button>

          <Text style={footer}>
            Merci d'utiliser TOUT SUITE ANNONCES.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaymentStatusEmail,
  subject: (data: Props) =>
    data.outcome === 'approved'
      ? `✅ Paiement validé — ${data.offerLabel}`
      : `❌ Paiement refusé — ${data.offerLabel}`,
  displayName: 'Statut de paiement',
  previewData: {
    recipientName: 'Awa',
    outcome: 'approved' as const,
    offerLabel: 'Business Pro',
    amount: '30 000',
    currency: 'FCFA',
    reference: 'TSA-BUSINESS-PRO-ABC123',
    paymentMethod: 'Wave',
    activationLabel: 'Pro actif',
    dashboardUrl: FALLBACK_URL,
  },
} satisfies TemplateEntry

export default PaymentStatusEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#3d3d3d', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  border: '1px solid #e6d9a8',
  borderRadius: '12px',
  padding: '18px 20px',
  backgroundColor: '#fbf7ea',
  margin: '8px 0 20px',
}
const cardLabel = { fontSize: '11px', color: '#7a6e3a', textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0' }
const cardValue = { fontSize: '15px', color: '#0d0d0d', fontWeight: 600 as const, margin: '4px 0 0' }
const cardValueBig = { fontSize: '22px', color: '#a8842c', fontWeight: 700 as const, margin: '4px 0 0' }
const cardMono = { fontSize: '13px', color: '#0d0d0d', fontFamily: 'Courier, monospace', margin: '4px 0 0' }
const cardStatusOk = { fontSize: '15px', color: '#0e7a3a', fontWeight: 700 as const, margin: '4px 0 0' }
const cardStatusKo = { fontSize: '15px', color: '#b3261e', fontWeight: 700 as const, margin: '4px 0 0' }
const hr = { borderColor: '#e8dca2', margin: '12px 0' }
const buttonGold = {
  backgroundColor: '#c9a84c', color: '#0d0d0d', fontSize: '14px',
  borderRadius: '10px', padding: '12px 22px', textDecoration: 'none', fontWeight: 700 as const,
}
const buttonDark = {
  backgroundColor: '#0d0d0d', color: '#ffffff', fontSize: '14px',
  borderRadius: '10px', padding: '12px 22px', textDecoration: 'none', fontWeight: 700 as const,
}
const footer = { fontSize: '12px', color: '#888', margin: '24px 0 0' }
