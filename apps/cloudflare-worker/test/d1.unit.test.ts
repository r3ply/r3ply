import { beforeAll, describe, expect, test } from 'vitest'
import { env } from 'cloudflare:test'
import { CommentCache, CommentState } from '../src/state/d1'

describe('comments_via_email', () => {
  beforeAll(async () => {
    // drops the table between each test (it is created automatically upon receiving a new comment)
    await env.TEST_DB.prepare(`DROP TABLE IF EXISTS comments_via_email;`).run()
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

describe('pending_comments', () => {
  beforeAll(async () => {
    // `clear` destroys/creates the table, so reusing it for test setup
    await cache.clear()
  })
  const cache = CommentCache(env.TEST_DB)
  test('set/get', async () => {
    // domains and paths are normalized via the URL class, so domains become lowercase and paths remain case sensitive
    await cache.set('A', '/B', '456', JSON.stringify({}))
    await cache.set('C', '/d', '789', JSON.stringify({}))

    const ab = await cache.get('a', '/b')
    const aB = await cache.get('a', '/B')
    const AB = await cache.get('A', '/B')
    const Ab = await cache.get('A', '/b')

    expect(ab).toStrictEqual([])
    expect(aB[0].comment_id).toBe('456')
    expect(AB[0].comment_id).toBe('456')
    expect(Ab).toStrictEqual([])

    const cd = await cache.get('c', '/d')
    const cD = await cache.get('c', '/D')
    const CD = await cache.get('C', '/D')
    const Cd = await cache.get('C', '/d')
    expect(cd[0].comment_id).toBe('789')
    expect(cD).toStrictEqual([])
    expect(CD).toStrictEqual([])
    expect(Cd[0].comment_id).toBe('789')

    const dne = await cache.get('D', '/')
    expect(dne).toStrictEqual([])
  })
  test('clear', async () => {
    await cache.set('abc', 'def', '3.14', {})
    await cache.set('uvw', 'xyz', '285', {})
    const abc = await cache.get('abc', 'def')
    const uvw = await cache.get('uvw', 'xyz')
    expect(abc[0].comment_id).toBe('3.14')
    expect(uvw[0].comment_id).toBe('285')
    await cache.clear()
    const actual = await env.TEST_DB.prepare(
      'SELECT * from pending_comments',
    ).run()
    expect(actual.results).toStrictEqual([])
  })
})
