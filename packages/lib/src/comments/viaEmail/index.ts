export { accept, AcceptedEmail } from './accept'
export { deliverable, DeliverableEmail } from './deliverable'
export { prepare, EmailTemplateContext } from './prepare'
export {
  prescreen,
  PrescreenResult,
  PrescreenPass,
  PrescreenFail,
} from './prescreen'
export { Anonymize, AnonymizeEmail, SignetIssuer } from './signet'
export { Encrypt, EncryptEmail, Decrypt, DecryptEmail } from './token'
import { R3plySystemConfig, R3plySiteConfig } from '@r3ply/schema/config'
import {
  R3plyCommentsConfig,
  R3plyEmailCommentsConfig,
} from '@r3ply/schema/config/comments'
import {
  prescreen as r3ply_prescreen,
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
import { Anonymize, SignetIssuer } from './signet'
import { Encrypt } from './token'
import { Err, Ok, Result } from 'oxide.ts'
import {
  LocalModeration,
  Moderation,
  ModerationChannelConfig,
} from '../../moderation'
import { GitHubModeration } from '../../moderation/github'

/**
 * A comment via email request.
 *
 * `recipient` is the config of the site receiving the comment is intended for.
 * `bytes` is the raw email as an array of bytes.
 *
 * @see R3plySiteConfig for details on the config.
 */
export type CommentEmailEventRequest = [
  recipient: R3plySiteConfig,
  bytes: Uint8Array,
]

/**
 * A response to a comment via email request.
 *
 * The pipeline that processes an email can be aborted (or fail) at any stage except prescreening.
 *
 * @see handle_email_event for implementation details of the actual pipeline.
 *
 * TODO: choose a tense for all the fields and stick with it (e.g. prescreening vs received are not the same tense)
 * TODO: change comment to process
 */
export type CommentEmailEventResponse = {
  prescreening: Result<PrescreenPass, PrescreenFail>
  received?: Result<CommentMetadata, Error>
  accepted?: Result<AcceptedEmail, Error>
  deliverable?: Result<DeliverableEmail, Error>
  prepared?: Result<CommentTemplateContext & EmailTemplateContext, Error>
  comment?: Result<string, Error>
  moderation?: {
    type: CommentViaEmailSupportedModerationChannels['type']
    request: Result<
      ReturnType<
        ReturnType<
          CommentViaEmailSupportedModerationChannels['handler']
        >['prepare']
      >,
      Error
    >
  }[]
}

/**
 * A function that accepts a comment via email request and returns a response.
 */
export type CommentViaEmailHandler = (
  e: CommentEmailEventRequest,
) => Promise<CommentEmailEventResponse>

/**
 * The templating context that will be made available for all comment via email events.
 */
export type CommentViaEmailContext = CommentTemplateContext &
  EmailTemplateContext

/**
 * The moderation channels that are supported by the comment via email handler.
 *
 * @see ModerationChannel
 */
export type CommentViaEmailSupportedModerationChannels =
  | GitHubModeration<CommentViaEmailContext>
  | LocalModeration<CommentViaEmailContext>

/**
 * Makes a new function that partially applies the depencies into the actual email comment event handler.
 *
 * @param anonymize_key symmetric key for decrypting an email event's signet.
 * @param encrypt_key symmetric key for encrypting the author's address of an email event
 * @param moderation_channels the moderation implementations supported by this commenting channel
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
  moderation_channels: CommentViaEmailSupportedModerationChannels[],
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
      moderation_channels,
    )
  }
}

/**
 * A simple, static function encapsulates the logic for r3ply email comment pipeline.
 *
 * @param email_event An email event, consisting of the recipient site's config and email bytes.
 * @param dependencies The various bits and pieces that are needed to do r3ply's job.
 *
 * @see prescreen the prescreen stage in the comment pipeline @see r3ply_prescreen
 * @see receive the receive stage in the comment pipeline @see r3ply_receive
 * @see accept the accept stage in the comment pipeline @see r3ply_accept
 * @see deliverable the deliverability stage in the comment pipeline @see r3ply_deliverable
 * @see prepare the prepare stage in the comment pipeline @see r3ply_prepare
 * @see process the process tage in the comment pipeline @see r3ply_process
 *
 * @param moderation_channels the moderation implementations supported by this commenting channel
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
  moderation_channels: CommentViaEmailSupportedModerationChannels[],
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
  const comments_config: R3plyCommentsConfig =
    prescreen_results.unwrap().comments_configured.general_comments
  const email_comments_config: R3plyEmailCommentsConfig =
    prescreen_results.unwrap().comments_configured.email_comments

  /**
   * (Receive)
   * Step 2. in the email comment pipeline is receiving the email.
   *
   * Receiving really just means attaching metadata to the comment, like giving it a comment ID and a timestamp. It should be thought of as dropping a letter in an official postal service mailbox, in the sense that your letter will be "postmarked" – i.e. timestamped – for the day it was dropped off, even if it isn't taken into custody – i.e. 'accepted' – the same day.
   */
  const metadata_result = await Result.safe(receive())
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
  const accepted_result = await Result.safe(
    accept(email_event.bytes, { metadata }),
  )
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
      metadata,
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
  > = await Result.safe(
    prepare(deliverable_email, {
      metadata,
      config: email_event.config,
      comments_config,
      email_comments_config,
      system: dependencies.system_config,
    }),
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
  results.comment = await Result.safe(
    process(template_context, {
      comment_template: email_event.config.comments?.email?.['comment_{}'],
      metadata,
      site: email_event.config,
    }),
  )

  /**
   * (Comment moderation)
   * Step 7. filter moderation channel handlers (based on config) and prepare requests for moderation.
   *
   * Each moderation channel encapsulates that channel's underlying implementation and input/output types. A moderation channel handler is when a moderation configuration has been added to that. However, part of the moderation configuration is some filtering logic. This is based on the comment source and the site a comment is addressed to.
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
      const [_, accepted, deliverable, context, comment] = results_list.unwrap()
      if (
        email_event.config.moderation &&
        email_event.config.moderation.enabled
      ) {
        const moderation_config = email_event.config.moderation
        results.moderation = await Promise.all(
          moderation_channels.flatMap((channel) => {
            return moderation_config[channel.type].map((config) => {
              const handler = async (
                allow_moderation: ReturnType<typeof Moderation.can_moderate>,
              ) => {
                if (allow_moderation.isOk()) {
                  const handler = channel.handler(
                    config as ModerationChannelConfig<any>,
                  )
                  const request = Moderation.bypass(config, context, {
                    cleartext: accepted.from.value,
                  }).then((bypass) => handler.prepare(comment, context, bypass))
                  return request.then((request) => Ok(request))
                } else {
                  return Err(allow_moderation.unwrapErr())
                }
              }
              return handler(
                Moderation.can_moderate(deliverable.site, 'email', config),
              ).then((result) => ({
                type: channel.type,
                request: result,
              }))
            })
          }),
        )
      }
    }
  }
  return results
}

if (import.meta.vitest) {
  const { test, expect, describe } = import.meta.vitest
  const signet_key = '0lR0WsHxbNYTMGMXYnGFPbDwTNbZJw3IF1gh/BPmeDs='
  const encrypt_key = '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
  const system = R3plySystemConfig({
    domains: ['r3ply.com', 'test.r3ply.com'],
  }).value!
  const signet_issuer = SignetIssuer(signet_key, system)
  const handle_email = mk_email_handler(system, signet_key, encrypt_key, {}, [
    LocalModeration(async (args) => 'test'),
  ])
  describe('comment via email handling', async () => {
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
            ...(await signet_issuer('spenc.es', 'r3ply.com', {
              issued_date: '2025-09-20',
            })),
          },
        ],
        comments: {
          email: {},
        },
        moderation: {
          local: [
            {
              'file_path_{}': 'example.md',
            },
          ],
        },
      }).value!,
      email_bytes,
    ])
    test('prescreen stage', () => expect(result.prescreening.isOk()).toBe(true))
    test('receive stage', () =>
      expect(result.received && result.received.isOk()).toBe(true))
    test('accept stage', () =>
      expect(result.accepted && result.accepted.isOk()).toBe(true))
    test('deliverablility stage', () =>
      expect(result.deliverable && result.deliverable.isOk()).toBe(true))
    test('prepare stage', () =>
      expect(result.prepared && result.prepared.isOk()).toBe(true))
    test('process stage', () =>
      expect(result.comment && result.comment.isOk()).toBe(true))
    test('moderation stage', () => {
      expect(result.moderation).toBeDefined()
      expect(result.moderation!.length).toBe(1)
      expect(result.moderation![0].type).toBe('local')
      expect(result.moderation![0].request.isOk()).toBe(true)
    })
  })
}

export const CommentViaEmail = mk_email_handler
