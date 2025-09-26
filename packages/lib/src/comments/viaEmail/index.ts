export * from './accept'
export * from './deliverable'
export * from './prepare'
export * from './prescreen'
export * from '../../signet'
export * from './crypto'
import { R3plySystemConfig, R3plySiteConfig, comments } from '@r3ply/schema'
import {
  prescreen as r3ply_prescreen,
  PrescreenResult,
  PrescreenPass,
  PrescreenFail,
} from './prescreen'
import { receive as r3ply_receive, CommentMetadata } from '../receive'
import { accept as r3ply_accept, AcceptedEmail } from './accept'
import {
  deliverable as r3ply_deliverable,
  DeliverableEmail,
} from './deliverable'
import { prepare as r3ply_prepare, EmailTemplateContext } from './prepare'
import { process as r3ply_process, CommentTemplateContext } from '../process'
import { Anonymize, Signet } from '../../signet'
import { Decrypt, Encrypt } from './crypto'
import { Ok, Result } from 'oxide.ts'
import {
  LocalModerationArgs,
  LocalModerationResult,
  ModerationImplementations,
  ModerationRequest,
  ModerationResponse,
  WriteLocalFile,
} from '../../moderation'

/**
 * An event represent a comment received via email, packaged as a request.
 *
 * `recipient` is the config of the site receiving the comment is intended for.
 *
 * `bytes` is the raw email as an array of bytes.
 *
 * @see R3plySiteConfig for details on the config.
 */
export type CommentEmailEventRequest = [
  recipient: R3plySiteConfig,
  bytes: Uint8Array,
]

/**
 * A response representing from the handling of the request to comment via email.
 *
 * The pipeline that processes an email can be aborted (or fail) at any stage except prescreening.
 *
 * @see handle_email_event for implementation details of the actual pipeline.
 */
export type CommentEmailEventResponse = {
  prescreening: Result<PrescreenPass, PrescreenFail>
  received?: Result<CommentMetadata, Error>
  accepted?: Result<AcceptedEmail, Error>
  deliverable?: Result<DeliverableEmail, Error>
  prepared?: Result<CommentTemplateContext & EmailTemplateContext, Error>
  comment?: Result<string, Error>
  moderation?: Result<
    {
      local: (write_local?: WriteLocalFile | undefined) => (
        | (() => Promise<{
            request: ModerationRequest<LocalModerationArgs>
            response: ModerationResponse<LocalModerationResult>
          }>)
        | undefined
      )[]
    },
    Error
  >
}

/**
 * A function that accepts a request to handle a comment via email and returns a response.
 */
export type CommentViaEmailHandler = (
  e: CommentEmailEventRequest,
) => Promise<CommentEmailEventResponse>

/**
 * Makes a new function that partially applies the depencies into the actual email comment event handler.
 *
 * @param anonymize_key symmetric key for decrypting an email event's signet.
 * @param encrypt_key symmetric key for encrypting the author's address of an email event
 * @param moderation the moderation implementations supported by this commenting channel
 * @returns a function that can handler email commenting events
 *
 * @see handle_email_event for details on how the actual email comment event pipeline works.
 */
function mk_email_handler(
  system: R3plySystemConfig,
  anonymize_key: string,
  encrypt_key: string,
  {
    prescreen = r3ply_prescreen,
    receive = r3ply_receive,
    accept = r3ply_accept,
    deliverable = r3ply_deliverable,
    prepare = r3ply_prepare,
    process = r3ply_process,
  } = {},
): CommentViaEmailHandler {
  return async function ([
    site,
    bytes,
  ]: CommentEmailEventRequest): Promise<CommentEmailEventResponse> {
    return handle_email_event(
      { config: site, bytes },
      {
        system_config: system,
        anonymize_key,
        encrypt_key,
      },
      {
        prescreen,
        receive,
        accept,
        deliverable,
        prepare,
        process,
      },
    )
  }
}

/**
 * A simple, static function encapsulates the logic for r3ply email comment pipeline.
 *
 * @param email_event An email event, consisting of the recipient site's config and email bytes.
 * @param dependencies The various bits and pieces that are needed to do r3ply's job.
 * @param stages Implementations for each stage in the email comment pipeline.
 *
 * @returns An object representing each stage of the email comment pipeline.
 */
async function handle_email_event(
  email_event: { config: R3plySiteConfig; bytes: Uint8Array },
  dependencies: {
    system_config: R3plySystemConfig
    anonymize_key: string
    encrypt_key: string
  },
  {
    prescreen,
    receive,
    accept,
    deliverable,
    prepare,
    process,
  }: {
    prescreen: typeof r3ply_prescreen
    receive: typeof r3ply_receive
    accept: typeof r3ply_accept
    deliverable: typeof r3ply_deliverable
    prepare: typeof r3ply_prepare
    process: typeof r3ply_process
  },
): Promise<CommentEmailEventResponse> {
  /**
   * (Prescreen)
   * Step 1. in the email comment pipeline is prescreening the email.
   *
   * This is a type of filtering that happens without actually examining the contents of the email. It looks mostly at the configs of the r3ply system, as well as recipient site's config. In addition, there are some checks that are performed on the email without actually opening it, e.g. checking it's size – in bytes – don't exceed what's configured. In the analogy of the postal service this is akin to the size of the mailbox opening, which would naturally prevent a shipping container or some – but not all – inapproriate package from entering the pipeline.
   *
   * What's returned are the results of the actual checks that were made, which includes whether a configuration was provided at all for comments in general, as well as comments via email.
   */
  const prescreen_results = prescreen(
    { size_bytes: email_event.bytes.byteLength },
    email_event.config,
    dependencies.system_config,
  )
  const results: CommentEmailEventResponse = {
    prescreening: prescreen_results,
  }
  if (prescreen_results.isErr()) return results
  const comments_config: comments.R3plyCommentsConfig =
    prescreen_results.unwrap().comments_configured.general_comments
  const email_comments_config: comments.R3plyEmailCommentsConfig =
    prescreen_results.unwrap().comments_configured.email_comments

  /**
   * (Receive)
   * Step 2. in the email comment pipeline is receiving the email.
   *
   * Receiving really just means attaching metadata to the comment, like giving it a comment ID and a timestamp. It should be thought of as dropping a letter in an official postal service mailbox, in the sense that your letter will be "postmarked" – i.e. timestamped – for the day it was dropped off, even if it isn't taken into custody – i.e. 'accepted' – the same day.
   */
  const metadata_result = Result.safe(() => receive())
  results.received = metadata_result
  if (metadata_result.isErr()) return results
  const metadata = metadata_result.unwrap()

  /**
   * (Accept)
   * Step 3. in the email comment pipeline is accepting the email.
   *
   * Accepting in this context means that the email's actual bytes are parsed. However at this point the sender's address has not been anonymized, because the plaintext version is still needed to check deliverability. In the postal service analogy, accepting is aking to a letter being taken into custody by an official worker.
   *
   * When an email is accepted what's returned is the main metadata of the email, e.g. MessageID, etc...
   */
  const accepted_result = Result.safe(() => accept(email_event.bytes))
  results.accepted = accepted_result
  if (accepted_result.isErr()) return results
  const accepted_email = accepted_result.unwrap()

  /**
   * (Deliverability)
   * Step 4. in the email comment pipeline is checking the deliverability of an email.
   *
   * Deliverability in this context means checking that it's even possible to deliver an email comment to its intended recipient. Here is where all the checks that are made that require actually examining the contents of the email. In the postal service analogy its similar to making sure the "to" address of a letter actually exists, but it goes further because site's can block certain senders.
   *
   * When the deliverability of an email is determined it will return all the parts that are needed to begin processing it, and by this point the author of the email will have their email encrypted and pseudo-anonymized.
   */
  const deliverable_result = await Result.safe(
    deliverable(accepted_email, {
      comments_config,
      email_comments_config,
      sites: email_event.config.site,
      anonymize: Anonymize.hmac(dependencies.anonymize_key),
      encrypt: Encrypt.email(dependencies.encrypt_key),
    }),
  )
  results.deliverable = deliverable_result
  if (deliverable_result.isErr()) return results
  const deliverable_email = deliverable_result.unwrap()

  /**
   * (Prepare template context)
   * Step 5. in the email comment pipeline is packaging the email into the template context.
   *
   * At this stage, when it's known if an email is deliverable or not, the template context needs to be formed. This consists of breaking down the parts of the email into an object. Any special logic required for converting the parsed fields of an email into a standarized template context object happens here.
   *
   * In addition to a standardized template object there are additional properties unique to email itself added.
   */
  const template_result: Result<
    CommentTemplateContext & EmailTemplateContext,
    Error
  > = Result.safe(() =>
    prepare(
      deliverable_email,
      metadata,
      email_event.config,
      comments_config,
      email_comments_config,
      dependencies.system_config,
    ),
  )
  results.prepared = template_result
  if (template_result.isErr()) return results
  const template_context = template_result.unwrap()

  /**
   * (Process comment)
   * Step 6. in the email comment pipeline is processing the template context into an actual commment.
   *
   * It is here that an actual comment is formed by binding the template context from the prior step with the templates provided by the site's configuration. If no template is provided then the full template context is stringified and written from its JSON object representation.
   */
  results.comment = Result.safe(() =>
    process(
      template_context,
      email_event.config,
      email_event.config.comments?.email?.['comment_{}'],
    ),
  )

  /**
   * (Comment moderation)
   * Step 7. prepare moderation
   */
  if (
    results.received &&
    results.accepted &&
    results.deliverable &&
    results.prepared &&
    results.comment
  ) {
    const results_list = Result.all(
      results.received,
      results.accepted,
      results.deliverable,
      results.prepared,
      results.comment,
    )
    if (results_list.isOk()) {
      const [received, accepted, deliverable, context, comment] =
        results_list.unwrap()
      const mk_moderation_impls = (write_local?: WriteLocalFile) =>
        ModerationImplementations<
          CommentTemplateContext & EmailTemplateContext
        >(
          deliverable.site,
          'email',
          Decrypt.email(dependencies.encrypt_key),
          write_local,
        )
      const partially_applied_local_moderation = (
        ...args: Parameters<typeof mk_moderation_impls>
      ) => {
        const moderation_impls = mk_moderation_impls(...args)
        if (moderation_impls.local) {
          const make_local_moderation = moderation_impls.local
          const result = (email_event.config.moderation?.local ?? [])
            .map((local_config) => make_local_moderation(local_config))
            .map((local_moderation) => {
              if (local_moderation) {
                return () =>
                  local_moderation.process(comment, context).then((request) => {
                    return local_moderation.send(request).then((response) => {
                      return {
                        request,
                        response,
                      }
                    })
                  })
              } else {
                return undefined
              }
            })
          return result
        } else return []
      }
      results.moderation = Ok({
        local: partially_applied_local_moderation,
      })
    }
  }
  return results
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  const signet_key = '0lR0WsHxbNYTMGMXYnGFPbDwTNbZJw3IF1gh/BPmeDs='
  const encrypt_key = '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
  const system = R3plySystemConfig({
    domains: ['r3ply.com', 'test.r3ply.com'],
  }).value!
  const issue_signet = await Signet.issue(signet_key, system)
  const handle_email = mk_email_handler(system, signet_key, encrypt_key)
  test('', async () => {
    const email_bytes = new TextEncoder().encode(
      (
        await import(
          // @ts-ignore todo: figure out how to get vscode to recognize these vitest raw imports
          '../../../../../test-data/eml/real/001.path.eml?raw'
        )
      ).default,
    )
    const result = await handle_email([
      R3plySiteConfig({
        site: [
          {
            ...(await issue_signet('spenc.es', 'r3ply.com', {
              issued_date: '2025-09-20',
            })),
          },
        ],
        comments: {
          email: {},
        },
      }).value!,
      email_bytes,
    ])
    console.log('COMMENT VIA EMAIL RESULT')
    console.log(result)
  })
}

export const CommentViaEmail = mk_email_handler
