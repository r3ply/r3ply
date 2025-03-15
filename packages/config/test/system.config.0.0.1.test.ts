import { describe, it, expect, beforeAll, assert } from 'vitest'
import {
  schema_ts,
  R3plySystemConfig,
  parser as imported_r3ply_system_config_parser,
  module,
  TypedParseResult,
} from '../src/system.config.0.0.1'
import esbuild from 'esbuild'

import { systemConfigParser as compiled_r3ply_system_config_parser } from '../dist/index.cjs'

// This code dynamically compiles the code made produced by the schema's 'module'
async function transpileAndImport(code: string) {
  const result = await esbuild.transform(code, {
    loader: 'ts',
    target: 'es2019',
  })
  const dataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(result.code)}`
  return import(dataUrl)
}
const dynamically_compiled_r3ply_system_config_parser = (
  await transpileAndImport(module)
).parser

// Create a type alias for the schema's parser's interface, a fn that takes string and returns a config
type R3plyConfigParser = (input: string) => TypedParseResult<R3plySystemConfig>

// A list of implementations of the parser that are to be tested under the same conditions
const implementations: [string, R3plyConfigParser][] = [
  ['IMPLEMENTATION: Imported Parser', imported_r3ply_system_config_parser],
  [
    'IMPLEMENTATION: Statically Compiled Parser',
    compiled_r3ply_system_config_parser,
  ],
  [
    'IMPLEMENTATION: Dynamically Compiled Parser',
    dynamically_compiled_r3ply_system_config_parser,
  ],
]

// The tests here loop through the implementations and apply all the tests to each one
describe.each(implementations)('%s', (_, parse) => {
  describe('the r3ply system config schema', () => {
    it('does not validate malformed configs', () => {
      expect(parse('').valid).toBe(false)
      expect(parse('just some text').valid).toBe(false)
      expect(parse('{}').valid).toBe(false)
      expect(parse('{ version: "0.0.1" }').valid).toBe(false)
    })
    it('validates the required (top-level) values', () => {
      expect(schema_ts.required).toStrictEqual(['version', 'domain', 'admin'])
      expect(
        parse(
          `{ "version": "0.0.1", "domain": "r3ply.com", "admin": [{ "name": "Guybrush Threepwood", "email": "guybrush@example.com"}]}`,
        ).valid,
      ).toBe(true)
    })
    it('does not allow unspecified values', () => {
      expect(
        parse(`{ "version": "0.0.1", "occupation": "programmer" }`).valid,
      ).toBe(false)
    })
  })
  describe('the r3ply system config parser', () => {
    it('provides helpful error messages', () => {
      expect(parse('').error).toContain('Unexpected end of JSON input')
      expect(parse('just some text').error).toContain('is not valid JSON')
      expect(parse('{}').error).toContain('required at #/version')
      expect(parse('{ version: "0.0.1" }').error).toContain(
        'Expected property name',
      )
      expect(
        parse(
          `{ "version": "0.0.2", "domain": "r3ply.com", "admin": [{ "name": "Guybrush Threepwood", "email": "guybrush@example.com"}]}`,
        ).error,
      ).toContain('validation failed for enum')
    })
  })
  describe('the root object of the r3ply system config', () => {
    it("has it's default values parsed automatically", () => {
      let result = parse(
        `{ "version": "0.0.1", "domain": "r3ply.com", "admin": [{ "name": "Guybrush Threepwood", "email": "guybrush@example.com"}]}`,
      )
      expect(result.value?.enabled).toBe(true)
    })
  })
  describe('the email object of the r3ply system config', () => {
    it('parses defaults automatically', () => {
      let result = parse(
        `{ "version": "0.0.1", "domain": "r3ply.com", "admin": [{ "name": "Guybrush Threepwood", "email": "guybrush@example.com"}]}`,
      )
      expect(result.value?.email.enabled).toBe(true)
      expect(result.value?.email.moderation).toBe(false)
      expect(result.value?.email.attachments).toBe(true)
      expect(result.value?.email.max_size_bytes).toBe(Math.pow(2, 20) * 5)
    })
    it('can override defaults', () => {
      let config = {
        version: '0.0.1',
        domain: 'r3ply.com',
        admin: [{ name: 'Guybrush Threepwood', email: 'guybrush@example.com' }],
        email: {
          enabled: false,
          moderation: true,
          attachments: false,
          max_size_bytes: 42,
          block_list: ['bob', 'mallory'],
        },
      }
      let result = parse(JSON.stringify(config))
      expect(result.value?.email.enabled).toBe(false)
      expect(result.value?.email.moderation).toBe(true)
      expect(result.value?.email.attachments).toBe(false)
      expect(result.value?.email.max_size_bytes).toBe(42)
      expect(result.value?.email.block_list).toStrictEqual(['bob', 'mallory'])
    })
  })
})
