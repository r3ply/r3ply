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
import { CommentCache, CommentState } from '../src/state/d1'
import TOML from '@iarna/toml'
import { siteConfigParser, systemConfigParser } from '@r3ply/config'
import { Anonymize, AnonymizeEmail } from '@r3ply/lib'
import { Encrypt } from '@r3ply/lib'

describe('Cloudflare r3ply Tests', () => {
  const signet_key = '5yT6DjMzqTxRp1mU1eEZJhcXlWMbE6ws9LhdXjjPYgM='
  const encrypt_email_key = 'C+CGDjjwO20erclXqpqbixlm2n8v5zR0w8LRabSNSww='
  beforeAll(async () => {
    let create_table = await env.TEST_DB.prepare(
      `DROP TABLE IF EXISTS comments_via_email;`,
    ).run()
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

[[site]]
domain = "banana-picker.com"
r3ply = "r3ply.com"
signet = "0zDZOXQA0S7YYB7kMb4Edw"
issued = 2025-08-22

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
domains = ["r3ply.com"]

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
    const select_cmd = env.TEST_DB.prepare(
      'select * from comments_via_email',
    ).run()
    await expect(select_cmd).rejects.toThrowError(/no such table/)
  })
  test('deliverable comment', async () => {
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(email),
      ok_gist_client,
      comment_state,
    )
    const deliverable_email = await cf_deliverable(accepted_email, {
      metadata,
      anonymize: Anonymize.hmac(signet_key),
      encrypt_email: Encrypt.email(encrypt_email_key),
      site_config,
      system_config,
      comment_state,
    })

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
    const deliverable_email = await cf_deliverable(accepted_email, {
      metadata,
      anonymize: Anonymize.hmac(signet_key),
      encrypt_email: Encrypt.email(encrypt_email_key),
      site_config,
      system_config,
      comment_state,
    })
    expect(deliverable_email.unwrapErr().message).toMatch(
      /Comment is undeliverable, `To`: `\[{\"name\":\"George Lucas\",\"address\":\"lucasarts.com@r3ply.com\"}\]` did not match exactly one valid address from: \[\"banana-picker.com@r3ply.com\"\]/,
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
    const deliverable_email = await cf_deliverable(accepted_email, {
      metadata,
      anonymize: Anonymize.hmac(signet_key),
      encrypt_email: Encrypt.email(encrypt_email_key),
      site_config,
      system_config,
      comment_state,
    })
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
    const deliverable_email = await cf_deliverable(accepted_email, {
      metadata,
      anonymize: Anonymize.hmac(signet_key),
      encrypt_email: Encrypt.email(encrypt_email_key),
      site_config,
      system_config,
      comment_state,
    })
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
  test.only('undeliverable comments: redaction of comment author failed', async () => {
    const { metadata, accepted_email } = await cf_accept(
      new TextEncoder().encode(email),
      ok_gist_client,
      comment_state,
    )
    const broken_redacter = async (input: string) => {
      throw new Error('Broken!')
    }
    const simulate_broken_anonymization: AnonymizeEmail = async (
      email_address: string,
      site_domain: string,
      signet: string,
      signet_issued: string,
    ) => {
      throw new Error('Broken!')
    }
    const deliverable_email = await cf_deliverable(accepted_email, {
      metadata,
      anonymize: simulate_broken_anonymization,
      encrypt_email: Encrypt.email(encrypt_email_key),
      site_config,
      system_config,
      comment_state,
    })
    expect(deliverable_email.unwrapErr().message).toMatch(
      /Error anonymizing comment author. Underlying reason:.\n\n```\nBroken!/,
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
    const deliverable_email = await cf_deliverable(accepted_email, {
      metadata,
      anonymize: Anonymize.hmac(signet_key),
      encrypt_email: Encrypt.email(encrypt_email_key),
      site_config,
      system_config,
      comment_state,
    })
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
      html: '<p>I found your banana picker.</p>\n',
      id: metadata.comment_id,
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
    const deliverable_email = await cf_deliverable(accepted_email, {
      metadata,
      anonymize: Anonymize.hmac(signet_key),
      encrypt_email: Encrypt.email(encrypt_email_key),
      site_config,
      system_config,
      comment_state,
    })
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
From: {{ author.pseudonym }}
Content: {{ comment.html }}`
    const comment = await cf_process(
      template_context,
      metadata,
      broken_gist_client,
      site_config_2,
      comment_state,
    )
    expect(comment.unwrap()).toBe(`\nComment ID: ${metadata.comment_id}
From: dfb58c7715bab2749cc030e5b90b2a333dc0beb0781af2cfa1cc7acc34479676
Content: <p>I found your banana picker.</p>\n`)
    const select = await env.TEST_DB.prepare(
      `select id, state FROM comments_via_email`,
    ).run()
    expect(select.results.length).toBe(1)
    expect(select.results[0]).toStrictEqual({
      id: metadata.comment_id,
      state: 'processed',
    })
    const cache = CommentCache(env.TEST_DB)
    const pending_comment = await cache.get(
      'banana-picker.com',
      '/blog/lemonhead',
      metadata.comment_id,
    )
    expect(pending_comment[0].comment_id).toBe(metadata.comment_id)
  })
  test('other moderation methods specified', async () => {
    const site_config = siteConfigParser(
      JSON.stringify(
        TOML.parse(`
version = "0.0.1"
domains = ["banana-picker.com"]
r3ply = ["r3ply.com"]

[comments.email]
block_list = ["lemonhead@*"]

[comments.email.moderation]
type = "webhook"
url = "https://banana-picker.com/comments"`),
      ),
    ).value!
  })
  test.skip('encryption scratch pad', async () => {
    const cryptoKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256, // 256-bit key,
      },
      true, // Allow exporting the key
      ['encrypt', 'decrypt'],
    )
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

  test.skip('foo', async () => {
    const foo = siteConfigParser(
      JSON.stringify(
        TOML.parse(`version = "0.0.1"
domains = ["r3ply-config.spence.pages.dev"]
r3ply = ['r3ply.com']

[comments.email]
"comment_{}" = "viaEmail/comment.template.md"

[comments.email.moderation]
type = 'github'
repo = "https://github.com/asimpletune/spenc.es"
# [Required] If you're using the \`r3ply-github-bot\` then specify the file path in the repo
# Templating is allowed here. The variables available are the same as the \`template\` field
"file_path_{}" = "/content/comments/{{ comment.id[:8] }}.md"
"commit_msg_{}" = "viaEmail/github.commit.msg.txt"
"pr_title_{}" = "New comment from \`{{ comment.id[:8] }}\`"
"pr_body_{}" = "viaEmail/github.pr.body.md"
"target_branch_{}" = "{{ comment.ts_rcvd }}_{{ comment.id[:8] }}-{{ author.pseudonym[:7] }}.md"
`),
      ),
    )
    console.log(foo.valid)
    console.log(foo.error)

    console.log(JSON.stringify(foo.value, null, 2))
  })
})
