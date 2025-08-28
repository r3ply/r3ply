import {
  R3plyModerationConfig,
  R3plyNotifyConfig,
  R3plySiteConfig,
  R3plySystemConfig,
} from '@r3ply/config'
import { accept, AcceptedEmail } from './viaEmail/accept'
import { deliverable, DeliverableEmail } from './viaEmail/deliverable'
import { prepare } from './viaEmail/prepare'
import { CommentMetadata, receive } from './receive'
import { CommentTemplateContext, process } from './process'
import { prescreen, PrescreenResult } from './viaEmail/prescreen'
import { Moderation, ModerationResult } from './moderation/moderation'
import { Anonymize, Signet } from './viaEmail/anonymize'
import { Encrypt } from './viaEmail/encrypt'

export interface R3ply {
  comments: {
    viaEmail: (
      anonymize_key: string,
      encrypt_key: string,
      moderator?: (type: 'github' | 'webhook') => Moderation<any, any>,
    ) => (
      email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
    ) => Promise<EmailEventResponse>
  }
}
export function R3ply(system: R3plySystemConfig): R3ply {
  function email_handler(
    anonymize_key: string,
    encrypt_key: string,
    moderator?: (type: 'github' | 'webhook') => Moderation<any, any>,
  ) {
    return async function (
      email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
    ): Promise<EmailEventResponse> {
      const [site, bytes] = email_event
      return handle_email_event(
        { config: site, bytes },
        {
          system_config: system,
          anonymize_key: anonymize_key,
          encrypt_key,
          moderator,
        },
      )
    }
  }
  return {
    comments: {
      viaEmail: email_handler,
    },
  }
}

export interface EmailEventResponse {
  prescreening: PrescreenResult
  received: CommentMetadata
  accepted: AcceptedEmail
  deliverable: DeliverableEmail
  prepared: CommentTemplateContext
  comment: string
  moderation?: ModerationResult<any, any>
}

async function handle_email_event(
  email_event: { config: R3plySiteConfig; bytes: Uint8Array },
  dependencies: {
    system_config: R3plySystemConfig
    anonymize_key: string
    encrypt_key: string
    moderator?: (type: 'github' | 'webhook') => Moderation<any, any>
  },
): Promise<EmailEventResponse> {
  const prescreen_results = prescreen(
    { email_size_bytes: email_event.bytes.byteLength },
    email_event.config,
    dependencies.system_config,
  )
  const metadata = receive()
  const accepted_email = accept(email_event.bytes)
  const deliverable_email = deliverable(accepted_email, {
    config: email_event.config,
    system: dependencies.system_config,
    anonymize: Anonymize.hmac(dependencies.anonymize_key),
    encrypt: Encrypt.email(dependencies.encrypt_key),
  })
  const template_context = deliverable_email.then((deliverable_email) =>
    prepare(
      deliverable_email,
      metadata,
      email_event.config,
      dependencies.system_config,
    ),
  )
  const comment = template_context.then((template_context) =>
    process(
      template_context,
      email_event.config,
      email_event.config.comments.email['comment_{}'],
    ),
  )
  // Note: if things need to be added that are independent of the basic email -> comment chain, probably a good place to do it is within this promise
  return Promise.all([deliverable_email, comment, template_context]).then(
    ([deliverable_email, comment, template_context]) => {
      if (
        dependencies.moderator &&
        email_event.config.comments.email.moderation.enabled
      ) {
        const moderation_config: R3plyModerationConfig =
          email_event.config.comments.email.moderation
        const moderator = dependencies.moderator(moderation_config.type)
        const notify_config: R3plyNotifyConfig =
          email_event.config.comments.email.notify
        return moderator
          .send(comment, template_context, moderation_config, notify_config)
          .then((moderation_rep) => {
            const result: EmailEventResponse = {
              prescreening: prescreen_results,
              received: metadata,
              accepted: accepted_email,
              deliverable: deliverable_email,
              prepared: template_context,
              comment: comment,
              moderation: moderation_rep,
            }
            return result
          })
      } else {
        const result: EmailEventResponse = {
          prescreening: prescreen_results,
          received: metadata,
          accepted: accepted_email,
          deliverable: deliverable_email,
          prepared: template_context,
          comment: comment,
          moderation: undefined,
        }
        return result
      }
    },
  )
}

// TODO: for some reason this is breaking my cloudflare builds...
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  const signet_key = '5yT6DjMzqTxRp1mU1eEZJhcXlWMbE6ws9LhdXjjPYgM='
  const encrypt_email_key = 'C+CGDjjwO20erclXqpqbixlm2n8v5zR0w8LRabSNSww='
  test('make', async () => {
    const { siteConfigParser, systemConfigParser } = await import(
      '@r3ply/config'
    )
    const TOML = await import('@iarna/toml')
    // @ts-ignore todo: figure out how to get vscode to recognize these vitest raw imports
    const real_001 = await import('../../test-data/eml/real/001.eml?raw')
    let email_bytes = new TextEncoder().encode(real_001.default)
    let system_config = systemConfigParser(
      JSON.stringify(
        TOML.parse(`
    version = "0.0.1"
    domains = ["r3ply.com"]

    [[admin]]
    name = "Guybrush Threepwood"
    email = "guybrush@example.com"
    `),
      ),
    ).value!
    const { signet, issued } = await Signet.issue(signet_key, system_config)(
      'spenc.es',
      'r3ply.com',
      '2025-08-25',
    )
    let site_config = siteConfigParser(
      JSON.stringify(
        TOML.parse(`
version = "0.0.1"
[[site]]
domain = "spenc.es"
r3ply = "r3ply.com"
signet = "${signet}"
issued = ${issued}

[comments.email]
"comment_{}" = """
+++
render = false
author = "{{ author.pseudonym[:7] }}"
date = {{ email.date }}
slug = "{{ comment.id[:8] }}"

[taxonomies]
comment = ["{{ comment.id[:8] }}"]
comments = ["{{ comment.subject.path }}"]
commenters = ["{{ author.pseudonym[:7] }}"]
threads = ["all"]
replies = ["0", "{{ comment.id[:8] }}"]

[extra]
object_path = "{{ comment.subject.path }}"
filename = "{{ comment.ts_rcvd }}_{{ comment.id[:8] }}-{{ author.pseudonym[:7] }}.md"
dt_written = {{ email.date }}
ts_rcvd = {{ comment.ts_rcvd }}
parent = "0"
comment_id = "{{ comment.id[:8] }}"
comment_id_full = "{{ comment.id }}"
commenter_id = "{{ author.pseudonym[:7] }}"
email_hash = "{{ author.pseudonym }}"
email_hash_version = "1.0.0"
auth = {{ email.auth.pass }}
dkim_pass = {{ email.auth.dkim }}
dmarc_pass = {{ email.auth.dmarc }}
spf_pass = {{ email.auth.spf  }}
+++

{{ comment.txt }}
"""

[comments.email.moderation]
type = 'webhook'
url = "https://example.com/comments"
`),
      ),
    )
    let r3ply = R3ply(system_config)

    let email_handler = r3ply.comments.viaEmail(signet_key, encrypt_email_key)
    await expect(
      email_handler([site_config.value!, email_bytes]),
    ).resolves.not.toThrowError()
  })
}
