import { Addr, Message as Email } from '@mail-parser/ts-bindings'
import { get_from, get_message_id, get_subject, get_to } from './email'

import { parse_email_bytes } from '@r3ply/wasm'
import { CommentMetadata } from '../receive'

/**
 * Just a simple wrapper used to indicated that something is secret
 */
export interface Secret<T> {
  value: T
}
export function Secret<T>(value: T): Secret<T> {
  return { value }
}

export interface AcceptedEmail {
  messageId: string
  from: Secret<string>
  to: Addr[]
  subject?: string
  email: Email
}

export async function accept(
  email_bytes: Uint8Array,
  {
    // metadata isn't used in the library but is exposed at the API level for consuming applications to use
    metadata,
  }: {
    metadata: CommentMetadata
  },
): Promise<AcceptedEmail> {
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
