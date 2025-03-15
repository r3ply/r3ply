import { beforeAll, describe, expect, test } from 'vitest'
import { env } from 'cloudflare:test'
import { CommentState } from '../src/state/d1'

describe('schema', () => {
  beforeAll(async () => {
    console.log('Setting up DB')
    let create_table = await env.TEST_DB.prepare(
      `DROP TABLE IF EXISTS comments_via_email;
			CREATE TABLE IF NOT EXISTS comments_via_email (
					id TEXT PRIMARY KEY NOT NULL, -- UUID stored as TEXT
					message_id TEXT UNIQUE NOT NULL, -- Email Message-ID must be globally unique
					created_utc DATETIME DEFAULT CURRENT_TIMESTAMP, -- Auto-generated timestamp for when the record was created
					state TEXT NOT NULL CHECK(state IN ('accepted', 'deliverable', 'undeliverable', 'prepared', 'unpreparable', 'processed', 'unprocessable', 'delivered')), -- comment state, note: comments are always in exactly one state
					files_id TEXT UNIQUE, -- comment files ID, E.g. gist, S3, R2
					files_url TEXT UNIQUE -- comment files URL, E.g. gist, S3, R2
			);`,
    ).run()
    console.log(`Done setting up DB, success: ${create_table.success}`)
  })
  const state = CommentState(env.TEST_DB)
  test('accept comment', async () => {
    const accept_result = (await state.viaEmail.accept('MESSAGE 123'))
      .results[0]
    const select_result = (
      await env.TEST_DB.prepare(
        'select created_utc from comments_via_email where message_id = ?',
      )
        .bind('MESSAGE 123')
        .run<{ created_utc: string }>()
    ).results[0]
    expect(accept_result.ts_rcvd).toBe(
      String(Date.parse(select_result.created_utc + 'Z') / 1000),
    )
    expect(accept_result.gist_id).toBeNull()
    expect(accept_result.gist_url).toBeNull()
  })
  test('update deliverability', async () => {
    const accept_result = (await state.viaEmail.accept('MESSAGE 123'))
      .results[0]
    await state.viaEmail.deliverable(accept_result.comment_id, 'deliverable')
    const select_deliverable = await env.TEST_DB.prepare(
      'SELECT state, id FROM comments_via_email',
    ).run()
    expect(select_deliverable.results.length).toBe(1)
    expect(select_deliverable.results[0]).toStrictEqual({
      id: accept_result.comment_id,
      state: 'deliverable',
    })
    await state.viaEmail.deliverable(accept_result.comment_id, 'undeliverable')
    const select_undeliverable = await env.TEST_DB.prepare(
      'SELECT state, id FROM comments_via_email',
    ).run()
    expect(select_undeliverable.results.length).toBe(1)
    expect(select_undeliverable.results[0]).toStrictEqual({
      id: accept_result.comment_id,
      state: 'undeliverable',
    })
  })
  test('update preparedness', async () => {
    const accept_result = (await state.viaEmail.accept('MESSAGE 123'))
      .results[0]
    await state.viaEmail.prepared(accept_result.comment_id, 'prepared')
    const select_prepared = await env.TEST_DB.prepare(
      'SELECT state, id FROM comments_via_email',
    ).run()
    expect(select_prepared.results.length).toBe(1)
    expect(select_prepared.results[0]).toStrictEqual({
      id: accept_result.comment_id,
      state: 'prepared',
    })
    await state.viaEmail.prepared(accept_result.comment_id, 'unpreparable')
    const select_unpreparable = await env.TEST_DB.prepare(
      'SELECT state, id FROM comments_via_email',
    ).run()
    expect(select_unpreparable.results.length).toBe(1)
    expect(select_unpreparable.results[0]).toStrictEqual({
      id: accept_result.comment_id,
      state: 'unpreparable',
    })
  })
  test('update processability', async () => {
    const accept_result = (await state.viaEmail.accept('MESSAGE 123'))
      .results[0]
    await state.viaEmail.processed(accept_result.comment_id, 'processed')
    const select_prepared = await env.TEST_DB.prepare(
      'SELECT state, id FROM comments_via_email',
    ).run()
    expect(select_prepared.results.length).toBe(1)
    expect(select_prepared.results[0]).toStrictEqual({
      id: accept_result.comment_id,
      state: 'processed',
    })
    await state.viaEmail.processed(accept_result.comment_id, 'unprocessable')
    const select_unpreparable = await env.TEST_DB.prepare(
      'SELECT state, id FROM comments_via_email',
    ).run()
    expect(select_unpreparable.results.length).toBe(1)
    expect(select_unpreparable.results[0]).toStrictEqual({
      id: accept_result.comment_id,
      state: 'unprocessable',
    })
  })
})
