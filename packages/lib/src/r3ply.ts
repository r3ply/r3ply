import { R3plySiteConfig, R3plySystemConfig } from '@r3ply/config'
import { accept } from './accept'
import { deliverable } from './deliverable'
import { CommentMetadata, prepare } from './prepare'
import { receive } from './receive'
import { process } from './process'
import { createHMAC } from './util'
import { prescreen } from './prescreen'
import { Moderation } from './moderation/moderation'
import { describe } from 'vitest'

export interface R3ply {
  comments: {
    viaEmail: (
      redact: (input: string) => Promise<string>,
      moderator?: Moderation,
    ) => (
      email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
    ) => Promise<string>
  }
}
export function R3ply(system: R3plySystemConfig): R3ply {
  function email_handler(
    redact: (input: string) => Promise<string>,
    moderator?: Moderation,
  ) {
    return async function (
      email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
    ): Promise<string> {
      const [site, bytes] = email_event
      return handle_email_event(
        { site, bytes },
        { system_config: system, redact, moderator },
      )
    }
  }
  return {
    comments: {
      viaEmail: email_handler,
    },
  }
}

async function handle_email_event(
  email_event: { site: R3plySiteConfig; bytes: Uint8Array },
  dependencies: {
    system_config: R3plySystemConfig
    redact: (input: string) => Promise<string>
    moderator?: Moderation
  },
): Promise<string> {
  prescreen(
    { email_size_bytes: email_event.bytes.byteLength },
    email_event.site,
    dependencies.system_config,
  )
  let metadata: CommentMetadata = receive()
  let accepted_email = accept(email_event.bytes)
  let deliverable_email = deliverable(
    accepted_email,
    dependencies.redact,
    email_event.site,
    dependencies.system_config,
  )
  let template_context = deliverable_email.then((deliverable_email) =>
    prepare(
      deliverable_email,
      metadata,
      email_event.site,
      dependencies.system_config,
    ),
  )
  let comment = template_context.then((template_context) =>
    process(template_context, email_event.site),
  )
  return Promise.all([comment, template_context])
    .then(([comment, template_context]) => {
      if (
        dependencies.moderator &&
        email_event.site.comments.email.moderation.enabled
      ) {
        dependencies.moderator.send(comment, template_context, email_event.site)
      }
    })
    .then((_) => comment)
}

// TODO: for some reason this is breaking my cloudflare builds...
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  describe('r3ply in-source tests', async () => {
    const { siteConfigParser, systemConfigParser } = await import(
      '@r3ply/config'
    )
    const TOML = await import('@iarna/toml')
    const { accept } = await import('./accept')
    const { deliverable } = await import('./deliverable')
    const { computeHMAC } = await import('./util')
    // @ts-ignore todo: figure out how to get vscode to recognize these vitest raw imports
    const real_001 = await import('../../test-data/eml/real/001.eml?raw')
    test('make', async () => {
      let email_bytes = new TextEncoder().encode(real_001.default)
      let site_config = siteConfigParser(
        JSON.stringify(
          TOML.parse(`
version = "0.0.1"
domain = "spenc.es"
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
domain = "r3ply.com"

[[admin]]
name = "Guybrush Threepwood"
email = "guybrush@example.com"
`),
        ),
      )
      let r3ply = R3ply(system_config.value!)
      let email_handler = r3ply.comments.viaEmail(createHMAC('password123'))
      let comment = await email_handler([site_config.value!, email_bytes])
      // console.log(comment)
    })
  })
}
