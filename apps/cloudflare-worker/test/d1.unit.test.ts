import { beforeEach, beforeAll, describe, expect, test } from 'vitest'
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
  beforeEach(async () => {
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
  beforeEach(async () => {
    // `clear` destroys/creates the table, so reusing it for test setup
    await cache.clear()
  })
  const cache = CommentCache(env.TEST_DB)
  test('domain is case insensitive', async () => {
    const work = await Promise.all([
      cache.set('A', 'b', '12', JSON.stringify({})),
      cache.set('a', 'b', '34', JSON.stringify({})),
    ])
    const [A_domains, a_domains] = await Promise.all([
      cache.all('A'),
      cache.all('a'),
    ])
    expect(A_domains).length(work.length).length(2)
    expect(A_domains).toStrictEqual(a_domains)
  })
  test('path is always relative to root', async () => {
    const work = await Promise.all([
      cache.set('a', 'b', '12', JSON.stringify({})),
      cache.set('a', '../b', '34', JSON.stringify({})),
      cache.set('a', './b', '56', JSON.stringify({})),
      cache.set('a', './https://b.com', '78', JSON.stringify({})),
    ])
    const all = await cache.all('a')
    expect(all.map((c) => c.domain)).toStrictEqual(['a', 'a', 'a', 'a'])
    expect(
      all
        .filter((c) => c.path == '/b')
        .map((c) => Number(c.comment_id))
        .sort((c1, c2) => c1 - c2),
    ).toStrictEqual([12, 34, 56])
    expect(all.filter((c) => c.comment_id == '78')[0].path).toBe(
      '/https://b.com',
    )
  })
  test('path is case sensitive', async () => {
    const work = await Promise.all([
      cache.set('a', 'b', '12', JSON.stringify({})),
      cache.set('a', 'B', '34', JSON.stringify({})),
    ])
    const [b_paths, B_paths] = await Promise.all([
      cache.get('a', 'b'),
      cache.get('a', 'B'),
    ])
    expect(b_paths.map((c) => [c.path, c.comment_id])).toStrictEqual([
      ['/b', '12'],
    ])
    expect(B_paths.map((c) => [c.path, c.comment_id])).toStrictEqual([
      ['/B', '34'],
    ])
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
  test('evict', async () => {
    const seconds_ago = (seconds: number): string =>
      new Date(Date.now() - seconds * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19)
    await cache.set('abc', 'def', '3.14', {})
    await cache.set('uvw', 'xyz', '285', {}, seconds_ago(10))
    const abc = await cache.get('abc', 'def')
    const uvw = await cache.get('uvw', 'xyz')
    expect(abc[0].comment_id).toBe('3.14')
    expect(uvw[0].comment_id).toBe('285')
    await cache.evict(15)
    const too_old_to_evict = await env.TEST_DB.prepare(
      'SELECT * from pending_comments',
    ).run()
    expect(too_old_to_evict.results).lengthOf(2)
    await cache.evict(5)
    const actual = await env.TEST_DB.prepare(
      'SELECT * from pending_comments',
    ).run()
    expect(actual.results).lengthOf(1)
  })
})
