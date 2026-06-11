/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
export interface TemplateEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previewData?: Record<string, any>
  to?: string | ((data: Record<string, unknown>) => string)
}

import { template as paymentStatus } from './payment-status.tsx'
import { template as newMessage } from './new-message.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'payment-status': paymentStatus as TemplateEntry,
  'new-message': newMessage as TemplateEntry,
}
