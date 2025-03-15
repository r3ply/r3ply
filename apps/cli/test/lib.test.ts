import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { project } from '../src/lib'
import { util } from '../src/util'
import mockfs from 'mock-fs'

describe('CLI library', () => {
  beforeEach(() => {
    mockfs.restore()
  })
  afterEach(() => {
    mockfs.restore()
  })
  test('find_up', async () => {
    mockfs({ '/a': { b: {}, b1: { c: {} }, 'a.txt': 'a' } })
    expect(await util.find_up('a.txt', '/a/b1/c/')).toBe('/a/a.txt')
    expect(await util.find_up('a.txt', '/a/b1/')).toBe('/a/a.txt')
    expect(await util.find_up('a.txt', '/a/')).toBe('/a/a.txt')
    expect(await util.find_up('a.txt', '/')).toBe(undefined)
    expect(await util.find_up('b1', '/a/b1/c/')).toBe('/a/b1')
    expect(await util.find_up('b1', '/a/b1/')).toBe('/a/b1')
    expect(await util.find_up('b1', '/a/')).toBe('/a/b1')
    expect(await util.find_up('b1', '/')).toBe(undefined)
    expect(await util.find_up('a', '/')).toBe('/a')
  })
  test('find_r3ply_dir', async () => {
    mockfs({ '/root': { project: { '.r3ply': {}, src: {} } } })
    expect((await project.find_r3ply_dir('/root')).unwrapErr().message).toMatch(
      /No .r3ply directory found/,
    )
    expect((await project.find_r3ply_dir('/root/project/')).unwrap()).toBe(
      '/root/project/.r3ply',
    )
    expect((await project.find_r3ply_dir('/root/project/src')).unwrap()).toBe(
      '/root/project/.r3ply',
    )
    expect(
      (await project.find_r3ply_dir('/root/project/src/.r3ply')).unwrap(),
    ).toBe('/root/project/.r3ply')
  })
  test('find_project_dir', async () => {
    mockfs({ '/root': { project: { '.r3ply': {}, src: {} } } })
    expect(
      (await project.find_project_dir('/root')).unwrapErr().message,
    ).toMatch(/No .r3ply directory found/)
    expect((await project.find_project_dir('/root/project/')).unwrap()).toBe(
      '/root/project',
    )
    expect((await project.find_project_dir('/root/project/src')).unwrap()).toBe(
      '/root/project',
    )
    expect(
      (await project.find_project_dir('/root/project/src/.r3ply')).unwrap(),
    ).toBe('/root/project')
  })
  test('find_config_files', async () => {
    mockfs({
      '/r3ply.config.toml': '',
      '/r3ply/config.toml': '',
      '/r3ply.config.json': '',
      '/r3ply/config.json': '',
      '/a/b/c/d/foo.txt': '',
      '/src': {},
    })
    expect((await project.find_config_files('/')).unwrap()).toStrictEqual([
      'r3ply.config.json',
      'r3ply.config.toml',
      'r3ply/config.json',
      'r3ply/config.toml',
    ])
    expect(
      (await project.find_config_files('/', 'a/b/c/d/foo.txt')).unwrap(),
    ).toStrictEqual(['a/b/c/d/foo.txt'])
    expect(
      (await project.find_config_files('/', 'a/b/c/d/foo.txt')).unwrap(),
    ).toStrictEqual(['a/b/c/d/foo.txt'])
    expect(
      (await project.find_config_files('/', 'a/**/foo.txt')).unwrap(),
    ).toStrictEqual(['a/b/c/d/foo.txt'])
    expect(
      (await project.find_config_files('/', 'a/b/c/d/foo.*')).unwrap(),
    ).toStrictEqual(['a/b/c/d/foo.txt'])
    expect((await project.find_config_files('/src')).unwrap()).toStrictEqual([])
    expect(
      (
        await project.find_config_files('/src', '../r3ply.config.json')
      ).unwrap(),
    ).toStrictEqual(['../r3ply.config.json'])
  })
  test('get_site_config_path', async () => {
    mockfs({
      '/.r3ply': {},
      '/public/.well-known/r3ply/config.toml': '',
    })
    expect((await project.get_site_config_path('/')).unwrap()).toBe(
      '/public/.well-known/r3ply/config.toml',
    )

    mockfs({
      '/.r3ply': {},
      '/public/.well-known/r3ply/r3ply.config.toml': '',
    })
    expect((await project.get_site_config_path('/')).unwrap()).toBe(
      '/public/.well-known/r3ply/r3ply.config.toml',
    )

    mockfs({
      '/project': {
        '.r3ply': {},
        public: {
          'config.toml': '',
        },
        src: {},
      },
    })
    expect(
      (await project.get_site_config_path('/project/src')).unwrapErr().message,
    ).toMatch(/No r3ply config found within/)

    mockfs({
      '/project': {
        '.r3ply': {},
        public: {
          'r3ply.config.toml': '',
          r3ply: {
            'config.toml': '',
          },
        },
        src: {},
      },
    })
    expect(
      (await project.get_site_config_path('/project/src')).unwrapErr().message,
    ).toMatch(/Multiple matches found/)
    expect(
      (
        await project.get_site_config_path(
          '/project/src',
          '../public/r3ply.config.toml',
        )
      ).unwrap(),
    ).toBe('/project/public/r3ply.config.toml')
    expect(
      (
        await project.get_site_config_path(
          '/project/src',
          '../public/r3ply/config.toml',
        )
      ).unwrap(),
    ).toBe('/project/public/r3ply/config.toml')
    expect(
      (
        await project.get_site_config_path('/project/src', 'r3ply.config.toml')
      ).unwrapErr().message,
    ).toMatch(/No config found at/)
  })
  test('init_r3ply_project_at', async () => {
    mockfs({
      root: {
        a: {},
        b: {
          '.r3ply': {},
          c: {
            d: {},
          },
        },
        e: {},
      },
    })
    expect((await project.init_r3ply_project_at('root/a')).unwrap()).toBe(
      'root/a/.r3ply',
    )
    expect(
      (await project.init_r3ply_project_at('root/a', '../e')).unwrapUnchecked(),
    ).toBe('root/e/.r3ply')
    expect(
      (await project.init_r3ply_project_at('root', 'b')).unwrapErr().message,
    ).toMatch(/Project already initialized/)
    expect(
      (await project.init_r3ply_project_at('root', 'b/c/d')).unwrapErr()
        .message,
    ).toMatch(/Nested r3ply project/)
  })
})
