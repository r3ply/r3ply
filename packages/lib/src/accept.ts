import { Addr, Message as Email } from '@mail-parser/ts-bindings'
import { Secret } from './types'
import { get_from, get_message_id, get_subject, get_to } from './email'

import { parse_email_bytes } from '@r3ply/wasm'

export interface AcceptedEmail {
  messageId: string
  from: Secret<string>
  to: Addr[]
  subject?: string
  email: Email
}

export function accept(email_bytes: Uint8Array): AcceptedEmail {
  const email = parse_email_bytes(email_bytes)
  const message_id = get_message_id(email)
  const from = () => Secret(get_from(email).address)
  const to = get_to(email)
  const subject = get_subject(email)
  return {
    messageId: message_id,
    from: from(),
    to,
    subject,
    email,
  }
}
