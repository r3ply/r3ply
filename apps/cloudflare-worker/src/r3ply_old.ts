import { _, Option } from 'oxide.ts'
import { CommentViaEmail, Env, ProcessEmailCommentResponse, R3plyUserConfig } from './types'
import { Message as ParsedMessage } from '@mail-parser/ts-bindings'
import { Util } from './util'
import { gist } from './state/gist'
import { d1 } from './state/d1'
import { email } from './email'
import { parse_email } from '@mail-parser/wasm-bindings'
const textEncoder = new TextEncoder()

/**
 * TODO: A common pattern is to create a bunch of functions that just paramterize whatever they need to do their work, then to create a function that is composed of calls to those functions, then to to abstract out all the things that are shared by those functions into some kind of constructor to a class, which provides the same functionality as those functions from before but has the shared parameters removed, allowing one to focus more on the core competency of that function rather than getting dependencies that are shared.
 *
 * That being said, when the time is right and the API is ready then I should do the same here. Probably candidates for dependencies that can be shared by all the functions would be `env: Env`, `msg: ForwardableEmailMessage`, and `user_config: R3plyUserConfig`
 *
 * This approach has a lot of benefits. By having standalone functions then you can call them outside the context of an instance of a class if needed, however in most cases have the class instance is how one would want to think about this stuff anyone. Additionally, having the functions together in a class instance would provide additional opportunities for storing some useful state, like if some kind of state machine functionality was to be added.
 */

export enum CommentSource {
  EMAIL = 'EMAIL',
}

// Inserts email upon initial receipt and assigns it a comment ID
async function receive_email(msg: ForwardableEmailMessage, env: Env) {
  let message_id = Option(msg.headers.get('Message-ID')).expect('Message-ID is required by email specs but was somehow missing!')
  return d1
    .insert_new_comment(env.R3PLY_DB, CommentSource.EMAIL, message_id)
    .then((comment_result) =>
      comment_result.map((comment) => {
        return new Request('https://noop.noop', { method: 'POST', body: msg.raw }).text().then((raw_email_content) => {
          return {
            id: comment.id,
            content: raw_email_content,
            source: CommentSource.EMAIL,
          }
        })
      }),
    )
    .then((result) => Util.invert_promise(result))
}

// Temporarily store the email as a gist, in case the service crashes during the processing of the email
async function store_comment_as_gist(
  comment: { id: string; content: string; source: CommentSource },
  env: Env,
  filename: string,
  description?: string,
) {
  // Prepare files for storage
  let files = {
    [filename]: {
      content: comment.content,
    },
  }

  // Create a new gist with files
  let create_gist = gist.create_gist(env.R3PLY_GIST_TOKEN, files, description)

  // Update the r3ply DB's state (to 'Stored'), as well as with references to gist ID and URL
  let update_db_with_gist = create_gist.then((create_gist_result) =>
    create_gist_result.map((gist) =>
      d1.update_comment_with_gist(env.R3PLY_DB, comment, gist).then((db_result) => db_result.and(create_gist_result)),
    ),
  )

  // Return results (note: comprehension is necessary to avoid nested promise results, e.g. Promise<Result<Promise<Result<gist_stuff, Error>>>>
  return update_db_with_gist.then((gist_result) => Util.comprehend_res(gist_result))
}

// Prepare the actual comment data from the email before it's sent off to the user
async function prepare_comment(
  addresses: { to: string; from: string },
  comment: { id: string; content: string },
  env: Env,
): Promise<CommentViaEmail> {
  // Send email to rust-wasm-email-parser in order to use headers that aren't available via the API as well as the actual email content
  // Note 1: `Authentication-Results` are for some reason not parsed by Cloudflare into their header format, so it has to be done manually by me
  // Note 2: URL below doesn't really matter, since it's a bound service, but I used something descriptive for reading logs from the Cloudflare console
  // Note 3: `to` and `from` are passed in explicitly because as an `Address` they must come in as a list, which could be tricky to handle for security reasons
  let initializeMailParserWasm = Promise.resolve() // TODO: change this (just this way because it used to actually be a promise but I didn't want to refactor immediately)
  return initializeMailParserWasm
    .then((_) => parse_email(textEncoder.encode(comment.content)) as ParsedMessage)
    .then((parsed_email) => {
      // get ts of now in unix format
      let ts_rcvd = Math.floor(Date.now() / 1000).toString()

      // Get headers
      let headers = parsed_email.parts[0].headers

      // Get Message-ID, to, subject, date
      let message_id = email.headers.text('message_id', headers).expect("'MessageID' is a required header")
      let subject = email.headers.text('subject', headers).unwrapOr('NO SUBJECT')
      let datetime = email.headers.date(headers).expect("'date' is a required header")

      // Get auth results
      let auth_details = email.headers
        .other('Authentication-Results', headers)
        .map((auth_results) => {
          if (auth_results.value != 'Empty' && 'Text' in auth_results.value) {
            return {
              dkim_check: auth_results.value.Text.includes('dkim=pass'),
              dmarc_check: auth_results.value.Text.includes('dmarc=pass'),
              spf_check: auth_results.value.Text.includes('spf=pass'),
            }
          }
        })
        .andThen((auth_results) => Option.nonNull(auth_results))
        .unwrapOr({
          dkim_check: false,
          dmarc_check: false,
          spf_check: false,
        })

      // Get email content
      let email_body_txt = parsed_email.text_body
        .map((idx) => {
          let message_part = parsed_email.parts[idx]
          return Option('Text' in message_part.body ? message_part.body.Text : undefined).expect(
            'Text indices MUST map to message parts with text',
          )
        })
        .join('') // Note: I'm not sure if the different message parts are supposedt to be joined like this or if there's some other, more standard way to do it

      // Create sha256's of private data
      let message_id_hash = Util.sha256(message_id)
      let sha256_sender = Util.sha256(addresses.from + env.EMAIL_HASH_PEPPER)

      return Promise.all([message_id_hash, sha256_sender]).then(([message_id_hash, sha256_sender]) => {
        // TODO: I need to change comment_id that's being sent here on the client side to use the real message id, in addition to a new field for a hash of the MessageID
        return {
          api_version: '0.0.1',
          comment_id: message_id_hash,
          ts_rcvd: ts_rcvd,
          commentator: {
            id: sha256_sender,
            version: env.EMAIL_HASH_PEPPER_VERSION,
          },
          email_details: {
            to: addresses.to,
            subject,
            date: Util.parsed_email_datetime_to_rfc3339(datetime),
            email_body_txt,
            auth_details,
          },
        }
      })
    })
}

// Store newly prepared comment data
async function store_comment_payload(gist_id: string, comment: { id: string }, comment_data: CommentViaEmail, env: Env) {
  // Prepare files to update gist with
  let files = {
    ['comment_data.json']: {
      content: JSON.stringify(comment_data, null, 2),
    },
  }

  // Update gist with files
  let update_gist = gist.update_gist(env.R3PLY_GIST_TOKEN, gist_id, files)

  // Update the r3ply DB's state (to 'Prepared')
  let update_db_state = update_gist.then((update_gist_result) =>
    update_gist_result.map((_) => d1.update_comment_state_to_prepared(env.R3PLY_DB, { id: comment.id })),
  )

  // Return results (note: comprehension is necessary to avoid nested promise results, e.g. Promise<Result<Promise<Result<db_stuff, Error>>>>
  return update_db_state.then((db_result) => Util.comprehend_res(db_result))
}

async function process_comment(user_config: R3plyUserConfig, comment_data: CommentViaEmail) {
  let create_comment_req = new Request(user_config.comment_processor.value, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      r3ply_webhook_security_token: `Bearer ${user_config.pw_to_process_comment || 'none'}`,
      r3ply_cf_security_token: `${user_config.waf_security_token || 'none'}`,
    },
    body: JSON.stringify(comment_data),
  })
  let create_comment = fetch(create_comment_req)
  return create_comment.then(async (create_comment) => {
    if (create_comment.status !== 200) {
      throw `Error creating comment. Response status: ${create_comment.status}, Response: ${await create_comment.text()}`
    }
    return create_comment
  })
}

async function comment_processed(comment: { id: string }, gist_id: string, comment_response: ProcessEmailCommentResponse, env: Env) {
  // Prepare files to update the gist with
  let choose_file_type = (mime: 'text/html' | 'text/plain' | 'text/markdown') => {
    if (mime == 'text/html') return 'html'
    else if (mime == 'text/markdown') return 'md'
    else return 'txt'
  }
  let files = {
    [`commentator_notif.${choose_file_type(comment_response.notify.commentator.message.mime.content_type)}`]: {
      content: comment_response.notify.commentator.message.raw,
    },
    [`moderator_notif.${choose_file_type(comment_response.notify.moderator.message.mime.content_type)}`]: {
      content: comment_response.notify.moderator.message.raw,
    },
  }

  // Update the gist with new files
  let update_gist = gist.update_gist(env.R3PLY_GIST_TOKEN, gist_id, files)

  // Update the r3ply DB's state (to 'Processed')
  let db_result = update_gist.then((update_result) => update_result.map((_) => d1.update_comment_state_to_processed(env.R3PLY_DB, comment)))

  // Return results (note: comprehension is necessary to avoid nested promise results, e.g. Promise<Result<Promise<Result<db_stuff, Error>>>>
  return db_result.then((db_result) => Util.comprehend_res(db_result))
}

export const r3ply = {
  receive_email: receive_email,
  store_comment_as_gist: store_comment_as_gist,
  prepare_comment: prepare_comment,
  store_comment_payload: store_comment_payload,
  process_comment: process_comment,
  comment_processed: comment_processed,
}
