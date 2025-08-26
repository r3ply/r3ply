import { beforeAll, describe, expect, test } from 'vitest'

import { env } from 'cloudflare:test'
import { CloudflareR3ply } from '../src/cloudflare-r3ply'
import { siteConfigParser, systemConfigParser } from '@r3ply/config'
import TOML from '@iarna/toml'
import { GistClient } from '../src/state/gist'
import { CommentState } from '../src/state/d1'
import { Result } from 'oxide.ts'

describe.skip('Cloudflare r3ply Tests', () => {
  beforeAll(async () => {
    let create_table = await env.TEST_DB.prepare(
      `DROP TABLE IF EXISTS comments_via_email;`,
    ).run()
  })
  test('end to end with test code setup', async () => {
    const system_config = systemConfigParser(
      JSON.stringify(
        TOML.parse(`
version = "0.0.1"
domains = ["r3ply.com"]

[[admin]]
name = "Ghost 'Le Chuck' Pirate"
email = "theghostlpirate@monkeyisland.com"`),
      ),
    ).value!
    const r3ply = CloudflareR3ply(system_config)(
      GistClient(env.R3PLY_GIST_TOKEN),
      CommentState(env.TEST_DB),
    )
    const { signet, issued } = await Signet.make(env.SIGNET_KEY)(
      'banana-picker.com',
      '2025-08-25',
    )
    const handle_email = r3ply.comments.viaEmail(
      env.SIGNET_KEY,
      env.EMAIL_ENCRYPT_KEY,
    )
    const site_config = siteConfigParser(
      JSON.stringify(
        TOML.parse(`
version = "0.0.1"
[[site]]
domain = "banana-picker.com"
r3ply = "r3ply.com"
signet = "${signet}"
issued = ${issued}

[comments.email]
block_list = ["lemonhead@*"]
"comment_{}_mime" = "text/markdown"
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
import { Signet } from '@r3ply/lib'
