import { describe, expect, test } from 'vitest'

import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from 'cloudflare:test'
import { GistClient, GistFiles } from '../src/state/gist'

describe.skip('gist client', () => {
  const gist = GistClient(env.R3PLY_GIST_TOKEN)
  test('create and update a file', async () => {
    const person = { name: 'bob' }
    const gist_files: GistFiles = {
      'hello.txt': { content: 'hello, world!' },
      'person.json': { content: JSON.stringify(person) },
    }
    const create_response = await gist.create_gist(gist_files)
    expect(create_response.isOk()).toBe(true)

    const file_updates: GistFiles = {
      'person.json': { content: JSON.stringify({ age: 42, ...person }) },
    }
    const update_response = await gist.update_gist(
      create_response.unwrap().id,
      file_updates,
    )
    expect(update_response.isOk()).toBe(true)
  })
})
