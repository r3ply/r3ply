import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from 'cloudflare:test'

import { describe, it, expect, test } from 'vitest'
// Could import any other source file/function here
import worker from '../src'

describe('Hello World worker', () => {
  it('responds with Hello World!', async () => {
    const request = new Request('http://example.com')
    // Create an empty context to pass to `worker.fetch()`
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, env, ctx)
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    await waitOnExecutionContext(ctx)
    expect(await response.text()).toBe('Hello, world!')
  })
})

import { tera } from '@r3ply/wasm'

describe('foo', () => {
  test('bar', () => {
    expect(tera('Hello, {{ name }}', { name: 'world' })).toBe('Hello, world')
  })
})
