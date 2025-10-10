import { beforeAll, describe, expect, test } from 'vitest'
import { env } from 'cloudflare:test'
import { CommentCache, CommentState } from '../src/state/d1'
import { CommentMetadata } from 'packages/lib/src/comments'

describe('comments', () => {
  beforeAll(async () => {
    // drops the table between each test (it is created automatically upon receiving a new comment)
    await env.TEST_DB.prepare(`DROP TABLE IF EXISTS comments;`).run()
  })
  const state = CommentState(env.TEST_DB)
  test('receive comment', async () => {
    const receive_result = await state.receive_comment('email')
    expect(receive_result.error).toBeUndefined()
    const metadata = receive_result.results[0]
    expect(metadata.comment_id).toBeDefined()
    expect(metadata.ts_rcvd).toBeDefined()
  })
})

describe('comments_via_email', () => {
  let metadata: CommentMetadata
  beforeAll(async () => {
    await env.TEST_DB.prepare(`DROP TABLE IF EXISTS comments_via_email;`).run()
    metadata = await state
      .receive_comment('email')
      .then((db_result) => db_result.results[0])
  })
  const state = CommentState(env.TEST_DB)
  const { accepted, deliverable, prepared, processed } = state.viaEmail
  test('accept comment', async () => {
    const {
      results: [row, ...others],
    } = await accepted(metadata.comment_id, 'MESSAGE 123', 'accepted')
    expect(row.state).toBe('accepted')
    expect(others).toStrictEqual([])
  })
  test('update deliverability', async () => {
    await accepted(metadata.comment_id, 'MESSAGE 123', 'accepted')
    const {
      results: [row, ...others],
    } = await deliverable(metadata.comment_id, 'deliverable')
    expect(row.state).toBe('deliverable')
    expect(others).toStrictEqual([])
  })
  test('update preparedness', async () => {
    await accepted(metadata.comment_id, 'MESSAGE 123', 'accepted')
    const {
      results: [row, ...others],
    } = await prepared(metadata.comment_id, 'prepared')
    expect(row.state).toBe('prepared')
    expect(others).toStrictEqual([])
  })
  test('update processability', async () => {
    await accepted(metadata.comment_id, 'MESSAGE 123', 'accepted')
    const {
      results: [row, ...others],
    } = await processed(metadata.comment_id, 'processed')
    expect(row.state).toBe('processed')
    expect(others).toStrictEqual([])
  })
  test('update files reference', async () => {
    await accepted(metadata.comment_id, 'MESSAGE 123', 'accepted')
    const {
      results: [row, ...others],
    } = await state.viaEmail.backedup('MESSAGE 123', 'message_id', 'abc', 'def')
    expect([row.files_id, row.files_url]).toStrictEqual(['abc', 'def'])
    expect(others).toStrictEqual([])
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
