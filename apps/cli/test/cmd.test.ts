import { Command } from 'commander'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { config_cmd } from '../src/cmd'
import { Result } from 'oxide.ts'
import mockfs from 'mock-fs'
import fs from 'fs'
import path from 'path'
import { Signet } from '@r3ply/lib'

describe('config', () => {
  describe('validate', () => {
    beforeEach(() => {
      mockfs.restore()
    })
    test('valid r3ply config', async () => {
      mockfs({
        '/.r3ply': {},
        '/r3ply.config.toml': fs
          .readFileSync(
            path.join(__dirname, 'resources/minimum_r3ply_site_config.toml'),
          )
          .toString(),
      })
      const program = new Command()
      const result = await Result.safe(
        program
          .addCommand(config_cmd('/'))
          .parseAsync(['node', 'test', 'config', 'validate']),
      )
      expect((await result).isOk()).toBe(true)
    })
    test('no r3ply project', async () => {
      mockfs({})
      const program = new Command()
      const result = Result.safe(
        program
          .addCommand(config_cmd('/'))
          .parseAsync(['node', 'test', 'config', 'validate']),
      )
      expect((await result).unwrapErr().message).toMatch(
        /No .r3ply directory found/,
      )
    })
    test('no r3ply config', async () => {
      mockfs({ '/.r3ply': {} })
      const program = new Command()
      const result = Result.safe(
        program
          .addCommand(config_cmd('/'))
          .parseAsync(['node', 'test', 'config', 'validate']),
      )
      expect((await result).unwrapErr().message).toMatch(
        /No r3ply config found within/,
      )
    })
    test('invalid r3ply config', async () => {
      mockfs({ '/.r3ply': {}, 'r3ply.config.toml': '' })
      const program = new Command()
      const result = Result.safe(
        program
          .addCommand(config_cmd('/'))
          .parseAsync(['node', 'test', 'config', 'validate']),
      )
      expect((await result).unwrapErr().message).toMatch(
        /config failed validation/,
      )
    })
  })
})
