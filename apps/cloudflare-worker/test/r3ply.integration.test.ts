import { beforeAll, describe, expect, test } from 'vitest'

import { env } from 'cloudflare:test'
import { CloudflareR3ply } from '../src/cloudflare-r3ply'
import { siteConfigParser, systemConfigParser } from '@r3ply/config'
import TOML from '@iarna/toml'
import { GistClient } from '../src/state/gist'
import { CommentState } from '../src/state/d1'
import { createHMAC } from '../src/util'
import { Result } from 'oxide.ts'

describe.skip('Cloudflare r3ply Tests', () => {
  beforeAll(async () => {
    console.log('Setting up DB')
    let create_table = await env.TEST_DB.prepare(
      `DROP TABLE IF EXISTS comments_via_email;
			CREATE TABLE IF NOT EXISTS comments_via_email (
					id TEXT PRIMARY KEY NOT NULL, -- UUID stored as TEXT
					message_id TEXT UNIQUE NOT NULL, -- Email Message-ID must be globally unique
					created_utc DATETIME DEFAULT CURRENT_TIMESTAMP, -- Auto-generated timestamp for when the record was created
					state TEXT NOT NULL CHECK(state IN ('accepted', 'deliverable', 'undeliverable', 'prepared', 'unpreparable', 'processed', 'delivered')), -- comment state, note: comments are always in exactly one state
					files_id TEXT UNIQUE, -- comment files ID, E.g. gist, S3, R2
					files_url TEXT UNIQUE -- comment files URL, E.g. gist, S3, R2
			);`,
    ).run()
    console.log(`Done setting up DB, success: ${create_table.success}`)
  })
  test('end to end with test code setup', async () => {
    const system_config = systemConfigParser(
      JSON.stringify(
        TOML.parse(`
version = "0.0.1"
domain = "r3ply.com"

[[admin]]
name = "Ghost 'Le Chuck' Pirate"
email = "theghostlpirate@monkeyisland.com"`),
      ),
    ).value!
    const r3ply = CloudflareR3ply(system_config)(
      GistClient(env.R3PLY_GIST_TOKEN),
      CommentState(env.TEST_DB),
    )
    const handle_email = r3ply.comments.viaEmail(
      createHMAC('integration test hmac key'),
    )
    const site_config = siteConfigParser(
      JSON.stringify(
        TOML.parse(`
version = "0.0.1"
domain = "banana-picker.com"
r3ply = ["r3ply.com"]

[comments.email]
block_list = ["lemonhead@*"]
"comment_{}_mime" = "text/markdown"
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
type = "webhook"
url = "https://banana-picker.com/comments"`),
      ),
    ).value!
    const email = `Date: Tue, 20 Jun 2023 20:28:11 +0200
From: Guybrush Threepwood <test@example.com>
To: Herman Toothrot <banana-picker.com@r3ply.com>
Message-Id: <FE97A840-9401-4B26-902E-61EB5D6CD285@example.com>
Subject: https://banana-picker.com/blog/lemonhead

I found your banana picker.
`
    const comment = await Result.safe(
      handle_email([site_config, new TextEncoder().encode(email)]),
    )
    expect(comment.isOk()).toBe(true)
    const select = (
      await env.TEST_DB.prepare('SELECT state from comments_via_email').run()
    ).results
    expect(select.length).toBe(1)
    expect(select[0].state).toBe('processed')
  })
  test.only('end to end through cf email handler', async () => {
    const email = `Date: Tue, 20 Jun 2023 20:28:11 +0200
From: Guybrush Threepwood <test@example.com>
To: Herman Toothrot <r3ply-config.spence.pages.dev@r3ply.com>
Message-Id: <FE97A840-9401-4B26-902E-61EB5D6CD285@example.com>
Subject: https://r3ply-config.spence.pages.dev/blog/lemonhead

I found your banana picker.

Please come pick it up

﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍
1. Write you comment above this ☝️ line
2. When you're ready just hit send 📤
3. Do NOT edit the email subject ⚠️

NOTE: Your email address will remain private


A subset of markdown can be used
(no images, headings, or script tags)

(Email signatures below 👇 will be ignored)
﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉

-HT
`
    const email_bytes = new TextEncoder().encode(email)
    const msg: ForwardableEmailMessage = {
      raw: new Response(email_bytes).body!,
      headers: new Headers(),
      rawSize: email_bytes.byteLength,
      setReject: function (reason: string): void {
        throw new Error('Function not implemented.')
      },
      forward: function (rcptTo: string, headers?: Headers): Promise<void> {
        throw new Error('Function not implemented.')
      },
      reply: function (message: EmailMessage): Promise<void> {
        throw new Error('Function not implemented.')
      },
      from: 'test@example.com',
      to: 'r3ply-config.spence.pages.dev@r3ply.com',
    }
    const result = await Result.safe(
      comment_via_email(msg, {
        gist_token: env.R3PLY_GIST_TOKEN,
        hmac_secret: env.HMAC_SECRET,
        gh_pw: env.GITHUB_APP_PW,
      }),
    )
    console.log(result.unwrapUnchecked())
  })
})

import { comment_via_email } from '../src'
