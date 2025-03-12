import { beforeEach, describe, expect, test } from 'vitest'
import { find_config_files, find_r3ply_dir, init_r3ply_project_at } from '../src/lib'
import { find_up } from '../src/util'
import mockfs from 'mock-fs'
import path from 'path'
import fs from 'fs'
import { siteConfigParser } from '../../config/dist/index.cjs'
import TOML from '@iarna/toml'
import { get_site_config } from '../src/lib'

describe('CLI library', () => {
  beforeEach(() => {
    mockfs.restore()
  })
  test('find_up', async () => {
    mockfs({ '/a': { b: {}, b1: { c: {} }, 'a.txt': 'a' } })
    expect(await find_up('a.txt', '/a/b1/c/')).toBe('/a/a.txt')
    expect(await find_up('a.txt', '/a/b1/')).toBe('/a/a.txt')
    expect(await find_up('a.txt', '/a/')).toBe('/a/a.txt')
    expect(await find_up('a.txt', '/')).toBe(undefined)
    expect(await find_up('b1', '/a/b1/c/')).toBe('/a/b1')
    expect(await find_up('b1', '/a/b1/')).toBe('/a/b1')
    expect(await find_up('b1', '/a/')).toBe('/a/b1')
    expect(await find_up('b1', '/')).toBe(undefined)
    expect(await find_up('a', '/')).toBe('/a')
    mockfs.restore()
  })
  test('find_r3ply_dir', async () => {
    mockfs({ '/p1': { '.r3ply': {}, src: {}, 'a1.txt': 'a1' } })
    expect((await find_r3ply_dir('/')).unwrapErr().message).toMatch(/No .r3ply directory found/)
    expect((await find_r3ply_dir('/p1/')).isOk()).toBe(true)
    expect((await find_r3ply_dir('/p1/src')).isOk()).toBe(true)
    expect((await find_r3ply_dir('/p1/.r3ply')).isOk()).toBe(true)
  })
  test('find_config_file', async () => {
    mockfs({
      '/p1': { a: { 'r3ply.config.json': '' } },
      '/p2': { '.well-known': { r3ply: { 'config.json': '' } } },
      '/p3': { 'config.toml': '' },
      '/p4': {},
    })
    expect((await find_config_files('/p1')).unwrap()).toStrictEqual(['a/r3ply.config.json'])
    expect((await find_config_files('.well-known/r3ply/config.json')).unwrap()).toStrictEqual([])
    expect((await find_config_files('/p3')).unwrap()).toStrictEqual([])
    expect((await find_config_files('/p4')).unwrap()).toStrictEqual([])
    mockfs.restore()
  })
  test('init_r3ply_project_at', async () => {
    mockfs({ '/': {} })
    expect((await init_r3ply_project_at('/', '.')).isOk()).toBe(true)
    const second_time = await init_r3ply_project_at('/', '.')
    expect(second_time.unwrapErr().message).toMatch(/file already exists/)
  })
  test('get_site_config', async () => {
    mockfs({
      '/p1': { '.r3ply': {}, public: { '.well-known': { 'r3ply.config.toml': '' } } },
      '/p2': { '.r3ply': {} },
      '/p3': { public: { '.well-known': { 'r3ply.config.toml': '' } } },
      '/p4': {},
    })
    expect((await get_site_config('/p1')).unwrap().valid).toBe(false)
    expect((await get_site_config('/p2')).unwrapErr().message).toMatch(/No r3ply config found/)
    expect((await get_site_config('/p3')).unwrapErr().message).toMatch(/No .r3ply directory found/)
    expect((await get_site_config('/p4')).unwrapErr().message).toMatch(/No .r3ply directory found/)
    // Note: need to temporarily restore the file system before  attempting to load the valid config
    mockfs.restore()
    mockfs({ '/.r3ply': {}, 'r3ply.config.toml': fs.readFileSync('test/resources/minimum_r3ply_site_config.toml').toString() })
    expect((await get_site_config('/')).unwrap().valid).toBe(true)
  })
})
