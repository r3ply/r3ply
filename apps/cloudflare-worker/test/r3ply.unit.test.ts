import { env } from 'cloudflare:test'

import { describe, expect, beforeAll, test } from 'vitest'
import {
  cf_accept,
  cf_deliverable,
  cf_prepare,
  cf_process,
} from '../src/cloudflare-r3ply'
import { createHMAC } from '../src/util'
import { Ok, Result } from 'oxide.ts'
import { GistClient, GistFiles } from '../src/state/gist'
import { CommentState } from '../src/state/d1'
import TOML from '@iarna/toml'
import { siteConfigParser, systemConfigParser } from '@r3ply/config'
import { merge_config, merge_remote_reference } from '../src'

describe('Cloudflare r3ply Tests', () => {
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

  const ok_gist_client: GistClient = {
    create_gist: async function (
      files: GistFiles,
      description?: string | undefined,
    ): Promise<Result<{ id: string; url: string }, Error>> {
      return Ok({
        id: 'ABC-GIST-ID',
        url: 'https://example.com/ABC-GIST-ID',
      })
    },
    update_gist: async function (
      gist_id: string,
      files: GistFiles,
    ): Promise<Result<void, Error>> {
      return Result.safe(() => {
        throw new Error('Function not implemented.')
      })
    },
  }
  const broken_gist_client: GistClient = {
    create_gist: async function (
      files: GistFiles,
      description?: string | undefined,
    ): Promise<Result<{ id: string; url: string }, Error>> {
      return Result.safe(() => {
        throw new Error('BROKEN!')
      })
    },
    update_gist: async function (
      gist_id: string,
      files: GistFiles,
    ): Promise<Result<void, Error>> {
      return Result.safe(() => {
        throw new Error('BROKEN!')
      })
    },
  }
  const comment_state = CommentState(env.TEST_DB)
  const email = `Date: Tue, 20 Jun 2023 20:28:11 +0200
From: Guybrush Threepwood <test@example.com>
To: Herman Toothrot <banana-picker.com@r3ply.com>
Message-Id: <FE97A840-9401-4B26-902E-61EB5D6CD285@example.com>
Subject: https://banana-picker.com/blog/lemonhead

I found your banana picker.
`
  const redacter = createHMAC('MY TEST HMAC SECRET')
  const site_config = siteConfigParser(
    JSON.stringify(
      TOML.parse(`
version = "0.0.1"
domain = "banana-picker.com"
r3ply = ["r3ply.com"]

[comments.email]
block_list = ["lemonhead@*"]

[comments.email.moderation]
type = "webhook"
url = "https://banana-picker.com/comments"`),
    ),
  ).value!
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
  test('comment is accepted and its state is updated', async () => {
    const { metadata } = await cf_accept(
      new TextEncoder().encode(email),
      ok_gist_client,
      comment_state,
    )
    const select_cmd = await env.TEST_DB.prepare(
      'select files_id, files_url from comments_via_email where id = ?',
    )
      .bind(metadata.comment_id)
      .run()
    expect(select_cmd.results[0]).toStrictEqual({
      files_id: 'ABC-GIST-ID',
      files_url: 'https://example.com/ABC-GIST-ID',
    })
  })
  test('failed gist creation and comment is still accepted (resulting in no gist id + url in state)', async () => {
    const { metadata } = await cf_accept(
      new TextEncoder().encode(email),
      broken_gist_client,
      comment_state,
    )
    const select_cmd = await env.TEST_DB.prepare(
      'select files_id, files_url from comments_via_email where id = ?',
    )
      .bind(metadata.comment_id)
      .run()
    expect(select_cmd.results[0]).toStrictEqual({
      files_id: null,
      files_url: null,
    })
  })
  test('can not accept comments via malformed emails', async () => {
    const no_to_field = cf_accept(
      new TextEncoder().encode(email.replace(/^To:.*$\n/m, '')),
      broken_gist_client,
      comment_state,
    )
    await expect(no_to_field).rejects.toThrowError(/`To` must not be missing/)
    const no_mid_field = cf_accept(
      new TextEncoder().encode(email.replace(/^Message-Id:.*$\n/m, '')),
      broken_gist_client,
      comment_state,
    )
    await expect(no_mid_field).rejects.toThrowError(
      /`Message_Id` must not be missing/,
    )
    const no_from_field = cf_accept(
      new TextEncoder().encode(email.replace(/^From:.*$\n/m, '')),
      broken_gist_client,
      comment_state,
    )
    await expect(no_from_field).rejects.toThrowError(
      /`From` must not be missing/,
    )
    const select_cmd = await env.TEST_DB.prepare(
      'select * from comments_via_email',
    ).run()
    expect(select_cmd.results.length).toBe(0)
  })
  test('deliverable comment', async () => {
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(email),
      ok_gist_client,
      comment_state,
    )
    const deliverable_email = await cf_deliverable(
      accepted_email,
      metadata,
      redacter,
      site_config,
      system_config,
      comment_state,
    )
    const select = await env.TEST_DB.prepare(
      `select id, state from comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'deliverable',
    })
  })
  test('undeliverable comments: no config for that site', async () => {
    const undeliverable_no_config_for_site = `From: Guybrush Threepwood <test@example.com>
To: George Lucas <lucasarts.com@r3ply.com>
Message-Id: <FE97A840-9401-4B26-902E-61EB5D6CD285@example.com>
Subject: https://lucasarts.com/blog/monkey-island-the-movie
`
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(undeliverable_no_config_for_site),
      ok_gist_client,
      comment_state,
    )
    const deliverable_email = await cf_deliverable(
      accepted_email,
      metadata,
      redacter,
      site_config,
      system_config,
      comment_state,
    )
    expect(deliverable_email.unwrapErr().message).toMatch(
      /Comment is underliverable, `To`: `.*\"lucasarts.com@r3ply.com\".*`/,
    )
    const select = await env.TEST_DB.prepare(
      `select id, state from comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'undeliverable',
    })
  })
  test('undeliverable comments: no url in subject', async () => {
    const undeliverable_no_url_in_subject = `From: Guybrush Threepwood <test@example.com>
To: Herman Toothrot <banana-picker.com@r3ply.com>
Message-Id: <FE97A840-9401-4B26-902E-61EB5D6CD285@example.com>
Subject: /blog/lemonhead
`
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(undeliverable_no_url_in_subject),
      ok_gist_client,
      comment_state,
    )
    const deliverable_email = await cf_deliverable(
      accepted_email,
      metadata,
      redacter,
      site_config,
      system_config,
      comment_state,
    )
    expect(deliverable_email.unwrapErr().message).toMatch(
      /config.comments.email.subject == \"url\" requires subject parses as a URL/,
    )
    const select = await env.TEST_DB.prepare(
      `select id, state from comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'undeliverable',
    })
  })
  test('undeliverable comments: sender blocked', async () => {
    const undeliverable_author_on_block_list = `From: Guybrush Threepwood <lemonhead@example.com>
To: Herman Toothrot <banana-picker.com@r3ply.com>
Message-Id: <FE97A840-9401-4B26-902E-61EB5D6CD285@example.com>
Subject: https://banana-picker.com/blog/lemonhead
`
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(undeliverable_author_on_block_list),
      ok_gist_client,
      comment_state,
    )
    const deliverable_email = await cf_deliverable(
      accepted_email,
      metadata,
      redacter,
      site_config,
      system_config,
      comment_state,
    )
    expect(deliverable_email.unwrapErr().message).toMatch(
      /Comment author was on block_list, matches: lemonhead@example.com/,
    )
    const select = await env.TEST_DB.prepare(
      `select id, state from comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'undeliverable',
    })
  })
  test('undeliverable comments: redaction of comment author failed', async () => {
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(email),
      ok_gist_client,
      comment_state,
    )
    const broken_redacter = async (input: string) => {
      throw new Error('Broken!')
    }
    const deliverable_email = await cf_deliverable(
      accepted_email,
      metadata,
      broken_redacter,
      site_config,
      system_config,
      comment_state,
    )
    expect(deliverable_email.unwrapErr().message).toMatch(
      /Error redacting comment author. Underlying reason:.\n\n```\nBroken!/,
    )
    const select = await env.TEST_DB.prepare(
      `select id, state from comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'undeliverable',
    })
  })
  test('prepare comments', async () => {
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(email),
      ok_gist_client,
      comment_state,
    )
    const deliverable_email = await cf_deliverable(
      accepted_email,
      metadata,
      redacter,
      site_config,
      system_config,
      comment_state,
    )
    const template_context = (
      await cf_prepare(
        deliverable_email.unwrap(),
        metadata,
        site_config,
        system_config,
        comment_state,
      )
    ).unwrap()
    expect(template_context.comment).toStrictEqual({
      author:
        '890983fe440e1d05ae062664348d6d36500030e1b46c80ea1f306328114eec70',
      author_7: '890983f',
      html: '<p>I found your banana picker.</p>\n',
      id: metadata.comment_id,
      id_8: metadata.comment_id.slice(0, 8),
      md: '<p>I found your banana picker.</p>\n',
      subject: {
        fragment: undefined,
        hostname: 'banana-picker.com',
        origin: 'https://banana-picker.com',
        path: '/blog/lemonhead',
        protocol: 'https:',
        queryParams: undefined,
        url: 'https://banana-picker.com/blog/lemonhead',
      },
      ts_rcvd: metadata.ts_rcvd,
      txt: 'I found your banana picker.',
    })
    const select = await env.TEST_DB.prepare(
      `select id, state from comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'prepared',
    })
  })
  test('process comments', async () => {
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(email),
      ok_gist_client,
      comment_state,
    )
    const deliverable_email = await cf_deliverable(
      accepted_email,
      metadata,
      redacter,
      site_config,
      system_config,
      comment_state,
    )
    const template_context = (
      await cf_prepare(
        deliverable_email.unwrap(),
        metadata,
        site_config,
        system_config,
        comment_state,
      )
    ).unwrap()
    let site_config_2 = structuredClone(site_config)
    site_config_2.comments.email['comment_{}'] = `
Comment ID: {{ comment.id }}
From: {{ comment.author }}
Content: {{ comment.html }}`
    const comment = await cf_process(
      template_context,
      metadata,
      broken_gist_client,
      site_config_2,
      comment_state,
    )
    expect(comment.unwrap()).toBe(`\nComment ID: ${metadata.comment_id}
From: 890983fe440e1d05ae062664348d6d36500030e1b46c80ea1f306328114eec70
Content: <p>I found your banana picker.</p>\n`)
    const select = await env.TEST_DB.prepare(
      `select id, state FROM comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'processed',
    })
  })

  test.skip('encryption scratch pad', async () => {
    const cryptoKey: CryptoKey = (await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256, // 256-bit key,
      },
      true, // Allow exporting the key
      ['encrypt', 'decrypt'],
    )) as CryptoKey
    const iv = crypto.getRandomValues(new Uint8Array(16))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'aes-gcm', iv },
      cryptoKey,
      new TextEncoder().encode('hello, world'),
    )
    const decrypted = await crypto.subtle.decrypt(
      { name: 'aes-gcm', iv },
      cryptoKey,
      encrypted,
    )
    console.log(new TextDecoder('utf-8').decode(decrypted))
  })

  test.skip('weird promises thing', async () => {
    const config_copy = structuredClone(site_config)
    console.log(config_copy.comments.email.notify['comment_received_notif_{}'])
    await merge_config(config_copy, (value: string) =>
      Promise.resolve(value + '123'),
    )
    console.log(config_copy.comments.email.notify['comment_received_notif_{}'])
  })

  test.skip('foo', async () => {
    const foo = siteConfigParser(
      JSON.stringify(
        TOML.parse(`version = "0.0.1"
domain = "r3ply-config.spence.pages.dev"
r3ply = ['r3ply.com']

[comments.email]
"comment_{}" = "viaEmail/comment.template.md"

[comments.email.moderation]
type = 'github'
repo = "https://github.com/asimpletune/spenc.es"
# [Required] If you're using the \`r3ply-github-bot\` then specify the file path in the repo
# Templating is allowed here. The variables available are the same as the \`template\` field
"file_path_{}" = "/content/comments/{{ comment.id_8 }}.md"
"commit_msg_{}" = "viaEmail/github.commit.msg.txt"
"pr_title_{}" = "New comment from \`{{ comment.id_8 }}\`"
"pr_body_{}" = "viaEmail/github.pr.body.md"
"target_branch_{}" = "{{ comment.ts_rcvd }}_{{ comment.id_8 }}-{{ comment.author_7 }}.md"
`),
      ),
    )
    console.log(foo.valid)
    console.log(foo.error)

    console.log(JSON.stringify(foo.value, null, 2))
  })
})
