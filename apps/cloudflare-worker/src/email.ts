import { Err, None, Ok, Option, Result, Some } from 'oxide.ts'
import { Env, ProcessEmailCommentResponse, R3plyUserConfig } from './types'
import { r3ply } from './r3ply_old'
import { Util } from './util'
import { createMimeMessage } from 'mimetext'
let CF_emailModule: unknown = undefined

// Note this function exists because Cloudflare currently throws an error if you try to import email related modules locally, as I suppose miniflare can't emulate them yet
export async function load_email_module(env: Env): Promise<Option<any>> {
  if (env.RUNNING_LOCALLY) {
    return None
  } else {
    if (CF_emailModule === undefined) {
      CF_emailModule = await import('cloudflare:email')
    }
    return Some(CF_emailModule)
  }
}

import { d1 } from './state/d1'
import { Address, DateTime, Header } from '@mail-parser/ts-bindings'

type ReasonToReject = 'Max allowed size exceeded' | 'Sender has been blocked' | 'No Message-ID!'

// A simple initial screening applied to incoming emails to avoid processing large emails or emails from blocked senders
function screen_email(user_config: R3plyUserConfig, msg: ForwardableEmailMessage, env: Env): Result<void, ReasonToReject> {
  let max_bytes_allowed = Math.min(user_config.max_allowed_email_bytes, Number(env.EMAIL_MAX_BYTES_DEFAULT))
  // First check size
  if (msg.rawSize > max_bytes_allowed) return Err('Max allowed size exceeded')

  // Parse email and perform additional checks
  if (user_config.block_list.includes(msg.from)) return Err('Sender has been blocked')

  // Return empty 'Ok' if everything's ok
  return Ok(undefined)
}

// Used to orchestrate the various neccesities right after the email has been received
async function handle(user_config: R3plyUserConfig, msg: ForwardableEmailMessage, env: Env) {
  // Create an ID for new comment and insert it into the DB, along with its message ID (since this path handles comments via email)
  let comment = r3ply.receive_email(msg, env)

  // Persist the comment's content to a gist, and then update the DB's state to 'stored' along with the gist's ID and URL
  let gist = comment
    .then((comment_result) => {
      return comment_result.map((comment) => {
        return r3ply.store_comment_as_gist(
          comment,
          env,
          'comment.eml',
          `Comment via email (from: ${msg.from}, to: ${msg.to}), subject: ${Option(msg.headers.get('subject')).unwrapOr('NO SUBJECT')}`,
        )
      })
    })
    .then((result) => Util.comprehend_res(result))

  // Prepare the 'comment data' (TODO: name this better), which is a JSON object that will be submitted as an argument to some kind of handler the user's configured (for now only webhooks are supported)
  // The DB's state is also updated to 'prepared' for that comment's entry
  let comment_payload = Promise.all([comment, gist])
    .then(([comment_result, gist_result]) =>
      Result.all(comment_result, gist_result).map(([comment, gist]) => {
        return r3ply
          .prepare_comment({ to: msg.to, from: msg.from }, comment, env)
          .then((comment_payload) => r3ply.store_comment_payload(gist.id, comment, comment_payload, env).then((_) => comment_payload))
      }),
    )
    .then((result) => Util.invert_promise(result))

  // After the user's comment handler has done its work, take the email notifications they've supplied and update the DB with them, along with the comment entry's state to 'processed'
  let processed_email = Promise.all([comment, gist, comment_payload])
    .then(([comment_result, gist_result, comment_data_result]) => Result.all(comment_result, gist_result, comment_data_result))
    .then((results) => {
      return results.map(([comment, gist, comment_data]) => {
        switch (user_config.comment_processor.type) {
          case 'URL':
            let create_comment = r3ply.process_comment(user_config, comment_data)
            let result = create_comment
              .then((rep) => {
                if (!rep.ok) {
                  let err_msg = `Response from customer webhook was not ok, more info: ${JSON.stringify(rep)}`
                  throw new Error(err_msg)
                }
                return rep
              })
              .then((webhook_rep) => webhook_rep.json() as any as ProcessEmailCommentResponse)
              .then((process_rep) => {
                return r3ply
                  .comment_processed(comment, gist.id, process_rep, env)
                  .then((_) => send_notifications(comment, msg, user_config, process_rep, env))
              })
            return Result.safe(result)
          default:
            throw 'TODO'
        }
      })
    })
    .then((result) => Util.comprehend_res(result))

  return processed_email
}

// Send notifications to the original comment submitter as well as the site's configured moderator and then update the notification states in the DB for this comment entry
async function send_notifications(
  comment: { id: string },
  msg: ForwardableEmailMessage,
  user_config: R3plyUserConfig,
  webhook_json: ProcessEmailCommentResponse,
  env: Env,
) {
  // 0. Load the Cloudflare Email module (see fn for more details why we do this)
  let CF_emailModule = await load_email_module(env)

  // 1. Notify site moderator that a new comment has been submitted
  const moderator_mime = createMimeMessage()
  moderator_mime.setSender({ name: `r3ply on behalf of ${user_config.site}`, addr: msg.to })
  moderator_mime.setRecipient(user_config.moderator_email)
  moderator_mime.setSubject(webhook_json.notify.moderator.subject)
  moderator_mime.addMessage({
    contentType: webhook_json.notify.moderator.message.mime.content_type,
    data: webhook_json.notify.moderator.message.raw,
  })

  // TODO refactor this
  let moderator_notification: Promise<D1Result<Record<string, unknown>>> = Result.safe(
    // @ts-ignore
    env.MODERATOR_EMAIL.send(new CF_emailModule.EmailMessage(msg.to, user_config.moderator_email, moderator_mime.asRaw())),
  ).then((result) => {
    return d1.update_notification_status(env.R3PLY_DB, comment, 'm_notif', 1)
  })

  // 2. Notify commentator that their comment has been received
  let message_id = Option(msg.headers.get('Message-ID')).expect('Message-ID is required by email specs but was somehow missing!')
  const reply_to_commentator = createMimeMessage()
  reply_to_commentator.setHeader('In-Reply-To', Util.foldHeader('In-Reply-To', message_id).value)
  reply_to_commentator.setHeader('References', Util.foldHeader('References', message_id).value)
  reply_to_commentator.setHeader(
    'Thread-Topic',
    Util.foldHeader('Thread-Topic', msg.headers.get('Thread-Topic') || msg.headers.get('Subject')!).value,
  )
  reply_to_commentator.setSender({ addr: msg.to, name: `r3ply on behalf of ${user_config.site}` })
  reply_to_commentator.setRecipient(msg.from)
  reply_to_commentator.setSubject(`Re: ${msg.headers.get('Subject')}`)
  reply_to_commentator.addMessage({
    contentType: webhook_json.notify.commentator.message.mime.content_type,
    data: webhook_json.notify.commentator.message.raw,
  })

  // TODO refactor this
  let commentator_notification: Promise<D1Result<Record<string, unknown>>> = Result.safe(
    // @ts-ignore
    msg.reply(new CF_emailModule.EmailMessage(msg.to, msg.from, reply_to_commentator.asRaw())),
  ).then((result) => {
    return d1.update_notification_status(env.R3PLY_DB, comment, 'c_notif', 1)
  })

  // 3. Return when both emails have been sent
  return Promise.all([moderator_notification, commentator_notification])
}

// Get the raw contents of the email, including headers, for various purposes, e.g. storing the email as a gist as a fail safe
// note: I create a request and just read the text because that's the easiest way to convert a readable stream into a string
async function raw_email_content(msg: ForwardableEmailMessage) {
  let req = new Request('https://noop.noop', { method: 'POST', body: msg.raw })
  return req.text()
}

export const email = {
  screen_email: screen_email,
  handle: handle,
  headers: {
    address(name: 'from' | 'to', headers: Header[]) {
      return Option(headers.find((h) => h.name == name && 'Empty' != h.value && 'Address' in h.value)).map(
        (h) => (h.value as { Address: Address }).Address,
      )
    },
    text(name: 'mime_version' | 'content_transfer_encoding' | 'subject' | 'message_id', headers: Header[]): Option<string> {
      return Option(headers.find((h) => h.name == name && 'Empty' != h.value && 'Text' in h.value)).map(
        (h) => (h.value as { Text: string }).Text,
      )
    },
    date(headers: Header[]): Option<DateTime> {
      return Option(headers.find((header) => header.name == 'date')).map(
        (date_header) => (date_header.value as { DateTime: DateTime }).DateTime,
      )
    },
    other(name: string, headers: Header[]) {
      return Option(headers.find((h) => typeof h.name === 'object' && h.name.other == name))
    },
  },
}
