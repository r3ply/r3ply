import {
  R3plyModerationConfig,
  R3plyNotifyConfig,
  R3plySiteConfig,
  R3plySystemConfig,
} from '@r3ply/config'
import { accept, AcceptedEmail } from './accept'
import { deliverable, DeliverableEmail } from './deliverable'
import { prepare } from './prepare'
import { CommentMetadata, receive } from './receive'
import { CommentTemplateContext, process } from './process'
import { createHMAC } from './util'
import { prescreen, PrescreenResult } from './prescreen'
import { Moderation, ModerationResult } from './moderation/moderation'

export interface R3ply {
  comments: {
    viaEmail: (
      redactor: (input: string) => Promise<string>,
      moderator?: (type: 'github' | 'webhook') => Moderation<any, any>,
    ) => (
      email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
    ) => Promise<EmailEventResponse>
  }
}
export function R3ply(system: R3plySystemConfig): R3ply {
  function email_handler(
    redactor: (input: string) => Promise<string>,
    moderator?: (type: 'github' | 'webhook') => Moderation<any, any>,
  ) {
    return async function (
      email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
    ): Promise<EmailEventResponse> {
      const [site, bytes] = email_event
      return handle_email_event(
        { site, bytes },
        { system_config: system, redactor: redactor, moderator },
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
  email_event: { site: R3plySiteConfig; bytes: Uint8Array },
  dependencies: {
    system_config: R3plySystemConfig
    redactor: (input: string) => Promise<string>
    moderator?: (type: 'github' | 'webhook') => Moderation<any, any>
  },
): Promise<EmailEventResponse> {
  const prescreen_results = prescreen(
    { email_size_bytes: email_event.bytes.byteLength },
    email_event.site,
    dependencies.system_config,
  )
  const metadata = receive()
  const accepted_email = accept(email_event.bytes)
  const deliverable_email = deliverable(
    accepted_email,
    dependencies.redactor,
    email_event.site,
    dependencies.system_config,
  )
  const template_context = deliverable_email.then((deliverable_email) =>
    prepare(
      deliverable_email,
      metadata,
      email_event.site,
      dependencies.system_config,
    ),
  )
  const comment = template_context.then((template_context) =>
    process(
      template_context,
      email_event.site,
      email_event.site.comments.email['comment_{}'],
    ),
  )
  // Note: if things need to be added that are independent of the basic email -> comment chain, probably a good place to do it is within this promise
  return Promise.all([deliverable_email, comment, template_context]).then(
    ([deliverable_email, comment, template_context]) => {
      if (
        dependencies.moderator &&
        email_event.site.comments.email.moderation.enabled
      ) {
        const moderation_config: R3plyModerationConfig =
          email_event.site.comments.email.moderation
        const moderator = dependencies.moderator(moderation_config.type)
        const notify_config: R3plyNotifyConfig =
          email_event.site.comments.email.notify
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
  test('make', async () => {
    const { siteConfigParser, systemConfigParser } = await import(
      '@r3ply/config'
    )
    const TOML = await import('@iarna/toml')
    // @ts-ignore todo: figure out how to get vscode to recognize these vitest raw imports
    const real_001 = await import('../../test-data/eml/real/001.eml?raw')
    let email_bytes = new TextEncoder().encode(real_001.default)
    let site_config = siteConfigParser(
      JSON.stringify(
        TOML.parse(`
version = "0.0.1"
domains = ["spenc.es"]
r3ply = ['r3ply.com']

[comments.email]
"comment_{}" = """
+++
render = false
author = "{{ comment.author_7 }}"
date = {{ email.date }}
slug = "{{ comment.id_8 }}"

[taxonomies]
comment = ["{{ comment.id_8 }}"]
comments = ["{{ comment.subject.path }}"]
commenters = ["{{ comment.author_7 }}"]
threads = ["all"]
replies = ["0", "{{ comment.id_8 }}"]

[extra]
object_path = "{{ comment.subject.path }}"
filename = "{{ comment.ts_rcvd }}_{{ comment.id_8 }}-{{ comment.author_7 }}.md"
dt_written = {{ email.date }}
ts_rcvd = {{ comment.ts_rcvd }}
parent = "0"
comment_id = "{{ comment.id_8 }}"
comment_id_full = "{{ comment.id }}"
commenter_id = "{{ comment.author_7 }}"
email_hash = "{{ comment.author }}"
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
    )
    let r3ply = R3ply(system_config.value!)

    let email_handler = r3ply.comments.viaEmail(createHMAC('password123'))
    await expect(
      email_handler([site_config.value!, email_bytes]),
    ).resolves.not.toThrowError()
  })
}
