import path from 'path'
import fs from 'fs'
import { Result, Option } from 'oxide.ts'
import { util } from './util'
import fg from 'fast-glob'
import TOML from '@iarna/toml'
import {
  R3plySignetConfig,
  R3plySiteConfig,
  R3plySystemConfig,
} from '@r3ply/schema/config'
import { ParseResult } from '@exodus/schemasafe'
import chalk from 'chalk'
import { RiMarkov } from 'rita'
import { fileURLToPath } from 'url'
import {
  util as r3ply_util,
  SignetIssuer,
  moderation as mod_todo,
} from '@r3ply/lib'
import dayjs from 'dayjs'
import { build_email } from '@r3ply/wasm'
import crypto from 'crypto'
import { mailbox } from 'typescript-mailbox-parser'
import { InitCmdOptions } from './cmds/init'
import { CommentTemplateContext } from 'packages/lib/src/comments/process.js'
import { CommentViaEmailContext } from 'packages/lib/src/comments/viaEmail/index.js'

// project stuff ---------------------------------------------------------------
export namespace project {
  type TypedParseResult<T> = Omit<ParseResult, 'value'> & { value?: T }
  const R3PLY_DIR = '.r3ply'
  const CONFIG_GLOB_PATTERNS = [
    `**/r3ply/config.{toml,json}`,
    `**/r3ply.config.{toml,json}`,
  ]
  const CLI_SYSTEM_CONFIG_FILENAME = 'r3ply.system.config.toml'
  const CLI_SETTINGS_FILENAME = 'r3ply.cli.settings.toml'
  const SIGNET_KEY_FILENAME = 'signet.key'
  const ENCRYPT_EMAIL_KEY_FILENAME = 'encrypt_email.key'
  export const DEFAULT_SITE_DOMAIN = 'site.local.test'
  export const DEFAULT_R3PLY_DOMAIN = 'cli.r3ply.test'
  export const DEFAULT_SIGNET_KEY =
    '6eFnDQTHov/yKkhLp/HdZDSU/vryNJ4XeNOgX2XBCVI='
  export const DEFAULT_EMAIL_KEY =
    'f+466zchScGV5oiKq4W5hxCct1iXBuwgRUnx8tBSuQQ='
  export const DEFAULT_CLI_SIGNET_LABEL = 'CLI'
  const DEFAULT_STATIC_DIR = 'static'
  const CACHE_DIR = 'cache'

  /**
   * Finds the `.r3ply` dir that should be located at the top-level of the user's repository
   * @param cwd
   * @returns the path to the `.r3ply` directory
   */
  export async function find_r3ply_dir(
    cwd: string,
  ): Promise<Result<string, Error>> {
    const find_result = util.find_up('.r3ply', cwd).then((path) => {
      if (path) return path
      else
        throw new util.CLIError(
          `No ${R3PLY_DIR} directory found. ${chalk.yellow(`You can run ${chalk.white('\`re init\`')} to initialize one.`)}`,
        )
    })
    return Result.safe(find_result)
  }

  /**
   * The top-level directory of the user's repository
   * @param cwd
   * @returns
   */
  export async function find_project_dir(
    cwd: string,
  ): Promise<Result<string, Error>> {
    return find_r3ply_dir(cwd).then((r3ply_dir) => {
      return r3ply_dir.map((r3ply_dir) => path.dirname(r3ply_dir))
    })
  }

  /**
   * Searches a specific directory for files that match the pattern of a r3ply site config
   * @param from_dir
   * @param file_glob
   * @returns
   */
  export async function find_site_config_files(
    from_dir: string,
    file_glob?: string,
  ): Promise<Result<string[], Error>> {
    if (file_glob)
      return Result.safe(fg.async([file_glob], { dot: true, cwd: from_dir }))
    else
      return Result.safe(
        fg.async(CONFIG_GLOB_PATTERNS, { dot: true, cwd: from_dir }),
      )
  }

  /**
   * Finds the static dir
   */
  export async function find_static_dir(cwd: string) {
    const r3ply_dir = find_r3ply_dir(cwd).then((result) => result.unwrap())
    const static_dir = path.join(await r3ply_dir, DEFAULT_STATIC_DIR)
    return static_dir
  }

  /**
   * Gets or creates the static dir
   */
  export async function get_static_dir(cwd: string, reset: boolean = false) {
    const static_dir = await find_static_dir(cwd)
    const access = await Result.safe(fs.promises.access(static_dir))
    if (access.isOk()) {
      return static_dir
    } else {
      return fs.promises.mkdir(static_dir).then((_) => static_dir)
    }
  }

  /**
   * Finds the cache dir
   */
  export async function find_cache_dir(cwd: string) {
    const static_dir = await find_static_dir(cwd)
    const cache_dir = path.join(await static_dir, CACHE_DIR)
    return cache_dir
  }

  /**
   * Gets or creates the cache dir
   */
  export async function get_cache_dir(cwd: string, reset: boolean = false) {
    const cache_dir = await find_cache_dir(cwd)
    const access = await Result.safe(fs.promises.access(cache_dir))
    if (access.isOk()) {
      if (reset) await clean_cache(cwd)
      return cache_dir
    } else {
      return fs.promises
        .mkdir(cache_dir, { recursive: true })
        .then((_) => cache_dir)
    }
  }

  /**
   * rm's and re-mkdir's the cache dir
   */
  export async function clean_cache(cwd: string) {
    const cache_dir = await find_cache_dir(cwd)
    const access = await Result.safe(fs.promises.access(cache_dir))
    if (access.isOk()) {
      await fs.promises
        .rm(cache_dir, { recursive: true, force: true })
        .then((_) => fs.promises.mkdir(cache_dir))
    } else {
      throw new util.CLIError(`No cache found at ${cache_dir}`)
    }
  }

  export async function add_comment_to_cache(
    cwd: string,
    comment: { path: string; content: any },
  ) {
    const cache_dir = await get_cache_dir(cwd)
    const comment_path = path.join(cache_dir, comment.path)
    const parent = path.dirname(comment_path)
    await fs.promises.mkdir(parent, { recursive: true })
    return fs.promises.writeFile(
      comment_path,
      JSON.stringify(comment.content, null, 2),
    )
  }

  export async function get_comment_from_cache(
    cwd: string,
    comment: { path: string },
  ) {
    const cache_dir = await get_cache_dir(cwd)
    const comment_path = path.join(cache_dir, comment.path)
    const access = await Result.safe(fs.promises.access(comment_path))
    if (access.isOk()) {
      return fs.promises
        .readFile(comment_path)
        .then((bytes) => JSON.parse(bytes.toString()))
    } else {
      return []
    }
  }

  export async function evict_comments_from_cache(
    cwd: string,
    at_path: string,
    max_age_seconds: number,
  ) {
    const cache_dir = await get_cache_dir(cwd)
    const comments_path = path.join(cache_dir, at_path)
    return walk(comments_path)

    // TODO: break this out into some kind of util function and add an argument to accept a function
    async function walk(dir: string): Promise<void> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full_path = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          return walk(full_path)
        } else {
          return fs.promises
            .readFile(full_path)
            .then(
              (bytes) =>
                JSON.parse(bytes.toString()) as (CommentTemplateContext &
                  CommentViaEmailContext)[],
            )
            .then((comments) => {
              const new_comments: (CommentTemplateContext &
                CommentViaEmailContext)[] = []
              const now_unix = dayjs().unix()
              for (const comment of comments) {
                const comment_sent_unix = dayjs(comment.email.date).unix()
                const age = now_unix - comment_sent_unix
                // keep comments that are <= max age
                if (age <= max_age_seconds) new_comments.push(comment)
                else
                  console.debug(
                    `Deleting comment with ID "${comment.comment.id}" as it is ${age} seconds old.`,
                  )
              }
              return fs.promises.writeFile(
                full_path,
                JSON.stringify(new_comments, null, 2),
              )
            })
        }
      }
    }
  }

  /**
   * Searches for r3ply site config file, with the `.r3ply` directory (i.e. r3ply_dir) as a starting point
   * @param cwd
   * @param config_path
   * @returns
   */
  export async function get_site_config_path(
    cwd: string,
    config_path?: string,
  ) {
    const full_config_path = (async () => {
      const project_dir = util.unsafeUnwrap(await find_project_dir(cwd))
      if (config_path) {
        const relative_files = util.unsafeUnwrap(
          await find_site_config_files(cwd, config_path),
        )
        if (relative_files.length == 0)
          throw new util.CLIError(
            `No config found at ${path.resolve(cwd, config_path)}`,
          )
        else if (relative_files.length > 1)
          throw new util.CLIError(
            `Multiple matches found: ${JSON.stringify(relative_files, null, 2)}`,
          )
        else return path.resolve(cwd, relative_files[0])
      } else {
        const relative_files = util.unsafeUnwrap(
          await find_site_config_files(project_dir),
        )
        if (relative_files.length == 0)
          throw new util.CLIError(`No r3ply config found within ${chalk.white(project_dir)}. ${chalk.yellow(`You can run ${chalk.white('\`re generate config\`')} to generate one. (Make sure to save it to the expected file path, e.g. ${chalk.white('"r3ply.config.toml"')}.)`)}`)
        else if (relative_files.length > 1)
          throw new util.CLIError(
            `Multiple matches found: ${JSON.stringify(relative_files, null, 2)}`,
          )
        else return path.resolve(project_dir, relative_files[0])
      }
    })()
    return Result.safe(full_config_path)
  }

  /**
   * Parses the r3ply site config into an object that can further be processed for other tasks
   * @param cwd
   * @param config_path
   * @returns
   */
  export async function parse_site_config(
    cwd: string,
    config_path?: string,
  ): Promise<Result<TypedParseResult<R3plySiteConfig>, Error>> {
    const parsed_site_config = get_site_config_path(cwd, config_path)
      .then((full_config_path) => util.unsafeUnwrap(full_config_path))
      .then((full_config_path) => {
        return fs.promises
          .readFile(full_config_path)
          .then((site_config_bytes) => site_config_bytes.toString())
          .then((site_config_str) =>
            full_config_path.endsWith('.toml')
              ? TOML.parse(site_config_str)
              : JSON.parse(site_config_str),
          )
          .then((site_config_json) => R3plySiteConfig.parse(site_config_json))
      })
    return Result.safe(parsed_site_config)
  }

  /**
   * Get the r3ply site config, as an object
   * @param cwd
   * @param config_path
   * @returns
   */
  export async function get_site_config(
    cwd: string,
    config_path?: string,
  ): Promise<Result<R3plySiteConfig, Error>> {
    const site_config = parse_site_config(cwd, config_path)
      .then((parsed_site_config) => util.unsafeUnwrap(parsed_site_config))
      .then((parsed_site_config) =>
        Option(parsed_site_config.value).expect(
          JSON.stringify(parsed_site_config.errors, null, 2),
        ),
      )
    return Result.safe(site_config)
  }

  export async function resolve_config(cwd: string, config_option?: string) {
    const site_config_path = await resolve_config_path(cwd, config_option)
    return util.unsafeUnwrap(await get_site_config(cwd, site_config_path))
  }

  export async function resolve_config_path(
    cwd: string,
    config_option?: string,
  ) {
    let site_config_path: string
    if (config_option) {
      site_config_path = util.unsafeUnwrap(
        await project.get_site_config_path(cwd, config_option),
      )
    } else {
      const project_dir = util.unsafeUnwrap(await project.find_project_dir(cwd))
      const cli_settings: any = util.unsafeUnwrap(
        await project.get_cli_settings(cwd),
      )
      site_config_path = util.unsafeUnwrap(
        await project.get_site_config_path(
          project_dir,
          cli_settings.default_config_path,
        ),
      )
    }
    return site_config_path
  }

  export async function get_cli_system_config(cwd: string) {
    const r3ply_dir = find_r3ply_dir(cwd)
    const result = r3ply_dir
      .then((r3ply_dir) => {
        return fs.promises.readFile(
          path.resolve(
            util.unsafeUnwrap(r3ply_dir),
            CLI_SYSTEM_CONFIG_FILENAME,
          ),
        )
      })
      .then((text) => {
        return R3plySystemConfig.parse(text.toString()).value!
      })
    return Result.safe(result)
  }

  export async function get_cli_settings(cwd: string) {
    const r3ply_dir = util.unsafeUnwrap(await project.find_r3ply_dir(cwd))
    const cli_settings_path = path.resolve(r3ply_dir, CLI_SETTINGS_FILENAME)
    const settings = Result.safe(
      fs.promises
        .readFile(cli_settings_path)
        .then((bytes) => bytes.toString())
        .then((settings) => TOML.parse(settings)),
    )
    return settings
  }

  export async function set_cli_settings(cwd: string, new_settings: any) {
    const r3ply_dir = util.unsafeUnwrap(await project.find_r3ply_dir(cwd))
    const cli_settings_path = path.resolve(r3ply_dir, CLI_SETTINGS_FILENAME)
    return Result.safe(
      fs.promises.writeFile(cli_settings_path, TOML.stringify(new_settings)),
    )
  }

  export const dereference_local_file: r3ply_util.config.DerferenceFile =
    async (
      base_uri: string,
      file_uri_ref?: string,
    ): Promise<string | undefined> => {
      const resolver = resolve_file_relative_to_site_config(base_uri)
      return resolver(file_uri_ref)
    }

  /**
   * Creates a file resolver based on the location of the r3ply site config
   * @param config_path the path of the file, relative to the r3ply site config
   * @returns utf8 contents of file at path
   */
  export function resolve_file_relative_to_site_config(config_path: string) {
    const file_resolver: (file_uri?: string) => Promise<string | undefined> = (
      file_uri,
    ) => {
      if (file_uri) {
        const r3ply_site_config_dir = path.dirname(config_path)
        const fully_qualified_file_path = path.join(
          r3ply_site_config_dir,
          file_uri,
        )
        return fs.promises
          .readFile(fully_qualified_file_path)
          .then((file_at_path_bytes) => file_at_path_bytes.toString())
      } else return Promise.resolve(undefined)
    }
    return file_resolver
  }

  export async function init_r3ply_project_at(
    cwd: string,
    { force, rotateKeys }: InitCmdOptions,
    dir?: string,
  ): Promise<
    Result<
      { r3ply_dir: string; signet_key: string; encrypt_email_key: string },
      Error
    >
  > {
    const new_r3ply_dir = path.join(cwd, dir ?? '', R3PLY_DIR)
    let parent_project_exists = find_r3ply_dir(new_r3ply_dir)
    const signet_key = rotateKeys
      ? crypto.randomBytes(32).toString('base64')
      : project.DEFAULT_SIGNET_KEY
    const email_key = rotateKeys
      ? crypto.randomBytes(32).toString('base64')
      : project.DEFAULT_EMAIL_KEY

    let system_config = R3plySystemConfig({
      domains: [project.DEFAULT_R3PLY_DOMAIN],
      admin: [
        {
          name: 'Guybrush Threepwood',
          email: 'guybrush@example.com',
        },
      ],
    }).value!
    const result = parent_project_exists.then((parent_project_exists) => {
      const file_access = Result.safe(fs.promises.access(new_r3ply_dir))
      return file_access.then(async (file_access) => {
        if (file_access.isErr() || force) {
          if (file_access.isOk() && force) {
            await fs.promises.rm(new_r3ply_dir, {
              recursive: true,
              force: true,
            })
            parent_project_exists = await find_r3ply_dir(new_r3ply_dir)
          }
          if (parent_project_exists.isOk()) {
            throw new util.CLIError(
              `Nested r3ply project. There is already a parent directory initialized at ${chalk.blue('`' + parent_project_exists.unwrap() + '`')}.${chalk.yellow('(Nested projects can lead to strange effects)')}`,
            )
          }
          return fs.promises.mkdir(new_r3ply_dir).then(() => {
            return fs.promises
              .writeFile(
                path.resolve(new_r3ply_dir, SIGNET_KEY_FILENAME),
                signet_key,
              )
              .then((_) => {
                return fs.promises.writeFile(
                  path.resolve(new_r3ply_dir, ENCRYPT_EMAIL_KEY_FILENAME),
                  email_key,
                )
              })
              .then((_) => {
                return fs.promises.writeFile(
                  path.resolve(new_r3ply_dir, CLI_SYSTEM_CONFIG_FILENAME),
                  TOML.stringify(system_config),
                )
              })
              .then((_) => {
                return fs.promises.writeFile(
                  path.resolve(new_r3ply_dir, CLI_SETTINGS_FILENAME),
                  '',
                )
              })
              .then((_) => {
                return fs.promises.writeFile(
                  path.resolve(new_r3ply_dir, '.gitignore'),
                  'static/cache',
                )
              })
              .then((_) => {
                return {
                  r3ply_dir: new_r3ply_dir,
                  signet_key,
                  encrypt_email_key: email_key,
                }
              })
          })
        } else {
          throw new util.CLIError(
            `Project already initialized at \`${chalk.white(path.dirname(new_r3ply_dir))}\`.`,
          )
        }
      })
    })
    return Result.safe(result)
  }

  export async function get_keys(
    cwd: string,
  ): Promise<{ signet_key: string; encrypt_email_key: string }> {
    return find_r3ply_dir(cwd).then((r3ply_dir) => {
      const signet_key = fs.promises
        .readFile(
          path.resolve(util.unsafeUnwrap(r3ply_dir), SIGNET_KEY_FILENAME),
        )
        .then((buffer) => buffer.toString())
      const encrypt_email_key = fs.promises
        .readFile(
          path.resolve(
            util.unsafeUnwrap(r3ply_dir),
            ENCRYPT_EMAIL_KEY_FILENAME,
          ),
        )
        .then((buffer) => buffer.toString())
      return Promise.all([signet_key, encrypt_email_key]).then(
        ([signet_key, encrypt_email_key]) => {
          return { signet_key, encrypt_email_key }
        },
      )
    })
  }

  export async function set_default_cli_config_path(
    cwd: string,
    config_path: string,
  ) {
    const project_dir = util.unsafeUnwrap(await find_project_dir(cwd))
    const proposed_path = path.resolve(project_dir, config_path)
    const relative = path.relative(project_dir, proposed_path)
    if (relative.startsWith('..'))
      throw new util.CLIError(
        `Config path can not be outside of project directory "${project_dir}"`,
      )
    const settings = util.unsafeUnwrap(await get_cli_settings(cwd))
    settings['default_config_path'] = config_path
    return set_cli_settings(cwd, settings)
  }
}

// r3ply library ---------------------------------------------------------------
export namespace generate {
  export function date(
    floor: number = Math.floor(Date.now() / 1000) - 315360000,
    ceiling: number = Math.floor(Date.now() / 1000),
  ) {
    return util.random_int(ceiling, floor) * 1000
  }

  export function email_addr() {
    const first = first_names[util.random_int(first_names.length)]
    const last = last_names[util.random_int(last_names.length)]
    const name = `${first} ${last}`
    const birthyear = util.random_int(1990, 1899)
    const domain = `${domains[util.random_int(domains.length)]}.${tlds[util.random_int(tlds.length)]}`
    const local = `${first}.${Math.random() > 0.5 ? birthyear : last}`
    const addr = `${local}@${domain}`
    const mailbox = `${first} ${last} <${addr}>`
    return { name, domain, local, addr, mailbox }
  }

  export function message_id(domain: string) {
    return `${crypto.randomUUID()}@${domain}`
  }

  export function subject(url: URL) {
    const site_path = site_paths[util.random_int(0, site_paths.length)]
    const site_slug = site_slugs[util.random_int(0, site_slugs.length)]
    return new URL(path.join(site_path, site_slug), url).href
  }

  export function comment_body(seed?: string[]) {
    // use meta imports to determine where the model file is stored
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const modelPath = path.resolve(__dirname, 'comments-markov-model.json')

    // load the model into markov chain and generate text
    const model_data = fs.promises.readFile(modelPath, 'utf-8')
    const markov = model_data.then((model_data) =>
      RiMarkov.fromJSON(model_data),
    )
    return markov.then((markov) =>
      markov.generate({
        maxLength: 36,
        temperature: 1,
        allowDuplicates: true,
        seed,
      }),
    )
  }

  export async function email(
    site_domain: string,
    r3ply_domain: string,
    options?: {
      messageId?: string
      date?: string
      from?: string
      to?: string
      subject?: string
      body?: string
    },
  ) {
    let from: { addr: string; name?: string; local: string; domain: string }
    if (options?.from) {
      from = parse_email_addr(options.from)
    } else {
      from = generate.email_addr()
    }
    const message_id = options?.messageId || generate.message_id(from.domain)
    const date = dayjs(options?.date ?? new Date(generate.date()))
    const to = parse_email_addr(options?.to || `${site_domain}@${r3ply_domain}`)
    const subject_url = new URL(`https://${to.local}/`)
    const subject = options?.subject || generate.subject(subject_url)
    // retry generating text 2x times before giving up
    const body =
      options?.body ||
      (await generate
        .comment_body()
        .catch(() =>
          generate.comment_body().catch(() => generate.comment_body()),
        ))
    const email = Result.safe(() =>
      build_email(
        message_id,
        BigInt(date.unix()),
        from.name,
        from.addr,
        to.addr,
        subject,
        body,
      ),
    )
    return email.unwrap()
  }

  function parse_email_addr(email: string): {
    addr: string
    name?: string
    local: string
    domain: string
  } {
    const result = mailbox(email)
    if (!result.ok)
      throw new util.CLIError(
        `Unable to parse email ${email}, errors: ${JSON.stringify(result)}.`,
      )
    result.local = result.local.replace(/^"(.*)"$/, '$1')
    return result
  }

  export async function signet(
    key: string,
    cli_system: R3plySystemConfig,
    {
      domain,
      r3ply,
      issued,
      label,
    }: {
      domain: string
      r3ply: string
      issued?: string
      label?: string
    },
  ): Promise<R3plySignetConfig> {
    if (r3ply == project.DEFAULT_R3PLY_DOMAIN) {
      return SignetIssuer(key, cli_system)(domain, r3ply, {
        issued_date: issued,
        label,
      })
    } else {
      return fetch(
        new URL(
          `https://${r3ply}/signet/${domain}${issued ? `/${issued}` : ''}`,
        ),
      ).then((response) => {
        if (response.ok)
          return response.json().then((json) => {
            return { ...json, label } as {
              domain: string
              r3ply: string
              signet: string
              issued: string
              label?: string
            }
          })
        else
          return response.text().then((text) => {
            throw new util.CLIError(text)
          })
      })
    }
  }

  export function config(site_config: R3plySiteConfig) {
    return TOML.stringify(site_config as any)
  }
}

// data generation -------------------------------------------------------------
const domains = [
  'ghostpirate',
  'lemonhead',
  'grog',
  'monkeyisland',
  'tryscummvm',
  'bananapicker',
  'meleeisland',
  'stanzboatz',
  'chickenpulley',
  'drinkgrog',
  'dontdrinkgrog',
]
const tlds = ['com', 'net', 'us', 'biz', 'org', 'io']
const first_names = [
  'LeChuck',
  'Guybrush',
  'Elaine',
  'Herman',
  'Stan',
  'Otis',
  'Wally',
  'Carla',
  'Meathook',
  'Morgan',
  'Murray',
  'Bob',
  'Horatio',
  'Ignatius',
  'Winslow',
  'Charles',
  'Kate',
  'Largo',
  'Rum',
  'Guy',
  'Haggis',
  'Cutthroat',
  'Bobby',
  'Frank',
  'Plunder',
  'Crimpdigit',
  'Jolene',
  'Dinghy',
  'Belinda',
  'Betsy',
  'Dread',
  'Esteban',
  'Rapp',
  'Doro',
  'Santiago',
  'Betty',
  'Biff',
  'Clarence',
  'Indy',
  'Henry',
  'Sallah',
  'Marion',
  'Sophia',
  'Jock',
  'Shorty',
  'Kazim',
  'Marcus',
  'Vogel',
]

const last_names = [
  "'Ghost' Pirate",
  'Threepwood',
  'Marley',
  'Toothrot',
  'Sunderson',
  'Fettucini',
  'Scabb',
  'Rottingham',
  'Ozzie',
  'Seepgood',
  'Van Helgen',
  'de Singe',
  'Bloodnose',
  "D'Oro",
  'Weatherby',
  'Nipikin',
  'Pegnose',
  'Hook',
  'Flambe',
  'Griswold',
  'Booty',
  'Bone',
  'Lemonhead',
  'Terror',
  'Snugglecakes',
  'Hartman',
  'Deadeye',
  'Graves',
  'McMutton',
  'Tannen',
  'Seagull',
  'Plank',
  'Drake',
  'Montezuma',
  'Ravenwood',
  'Donovan',
  'Oxley',
  'Brody',
  'Katanga',
  'Molotov',
  'Spalko',
  'Reinhardt',
  'Belloq',
  'Dietrich',
  'McHale',
  'Voller',
  'Strasser',
  'Krell',
  'Egon',
]

const site_slugs = [
  'how-I-met-herman-toothrot',
  'finding-dads-diary',
  'lechucks-curse-explained',
  'secrets-of-monkey-island',
  'guybrushs-best-comebacks',
  'stan-and-his-neverending-sales',
  'elaine-marley-the-real-hero',
  'murray-the-talking-skull',
  'top-10-insults-from-monkey-island',
  'puzzle-solutions-you-forgot',
  'escape-from-monkey-island-review',
  'where-is-plunder-island',
  'fettucini-brothers-circus',
  'monkey-island-easter-eggs',
  'worst-ways-to-die-in-monkey-island',
  'indiana-jones-and-the-fate-of-atlantis-retrospective',
  'top-5-foes-of-indiana-jones',
  'finding-the-lost-dialog-of-plato',
  'short-rounds-missing-adventure',
  'best-action-scenes-in-indy-games',
  'henry-jones-sr-quotes',
  'why-marion-ravenwood-rules',
  'greatest-puzzles-in-fate-of-atlantis',
  'monkey-kombat-strategy-guide',
  'the-many-faces-of-lechuck',
  'deadly-traps-in-indiana-jones-games',
  'sophia-hapgood-character-analysis',
  'replaying-last-crusade',
  'jock-lindsey-indianas-best-sidekick',
  'marcus-brody-memorial',
  'did-the-nazis-win-in-fate-of-atlantis',
  'monkey-island-hidden-dialogue',
  'lost-scenes-from-indiana-jones-games',
  'why-we-need-more-point-and-click-adventures',
  'best-inventory-items-in-monkey-island',
  'fate-of-atlantis-secret-ending',
  'best-quotes-from-monkey-island',
  'worst-decisions-in-indy-games',
  'stan-never-blinks-conspiracy',
  'top-5-worst-ways-to-lose-in-monkey-island',
  'replaying-monkey-island-in-2025',
  'who-really-invented-grog',
  'cut-content-from-monkey-island',
  'why-monkey-island-3a-needs-to-happen',
  'best-easter-eggs-in-indiana-jones-games',
  'toughest-fights-in-monkey-island',
  'horrible-ways-to-die-in-indiana-jones-games',
  'ultimate-guide-to-monkey-island-lore',
  'worst-npc-in-monkey-island',
  'is-guybrush-a-good-pirate',
]

const site_paths = [
  'blog',
  'posts',
  'articles',
  'reviews',
  'retrospectives',
  'guides',
  'walkthroughs',
  'tips',
  'secrets',
  'features',
  'history',
  'interviews',
  'behind-the-scenes',
  'lore',
  'characters',
  'analysis',
  'easter-eggs',
  'strategy',
  'rankings',
  'opinion',
]

export namespace moderation {
  export async function write_comment_locally(
    cwd: string,
    args: mod_todo.LocalModerationArgs,
    dryrun: boolean = false,
  ): Promise<string> {
    const project_dir = util.unsafeUnwrap(await project.find_project_dir(cwd))
    const proposed_path = path.join(project_dir, args.relative_path)
    const path_rel_to_proj = path.relative(project_dir, proposed_path)
    if (path_rel_to_proj.startsWith('..'))
      throw new util.CLIError(
        `Can't write comment to '${proposed_path}' because path is outside r3ply project directory!`,
      )
    else {
      if (!dryrun) {
        fs.writeFileSync(proposed_path, args.comment)
      }
      return proposed_path
    }
  }

  export function mock_github_api_fetcher(): mod_todo.PerformGitHubApiFetch {
    const result: mod_todo.PerformGitHubApiFetch = async (
      args: mod_todo.CreateCommentInRepoArgs,
    ) => {
      const pr_num = 123
      const result: mod_todo.GitHubModerationContext['github'] = {
        repo: {
          owner: args.repo_owner,
          name: args.repo_name,
          url: `https://github.com/${args.repo_owner}/${args.repo_name}`,
        },
        comment: {
          path: args.new_comment_filepath,
        },
        commit: {
          message: args.new_comment_filepath,
        },
        pr: {
          branch: {
            base: args.target_branch,
            head: args.source_branch,
          },
          url: `https://api.github.com/repos/${args.repo_owner}/${args.repo_name}/pulls/${pr_num}`,
          html_url: `https://github.com/${args.repo_owner}/${args.repo_name}/pulls/${pr_num}`,
          diff_url: `https://github.com/${args.repo_owner}/${args.repo_name}/pulls/${pr_num}.diff`,
          patch_url: `https://github.com/${args.repo_owner}/${args.repo_name}/pulls/${pr_num}.patch`,
          issue_url: `https://github.com/${args.repo_owner}/${args.repo_name}/issues/${pr_num}`,
          commits_url: `https://github.com/${args.repo_owner}/${args.repo_name}/pulls/${pr_num}/commits`,
          comments_url: `https://github.com/${args.repo_owner}/${args.repo_name}/pulls/${pr_num}/comments`,
          statuses_url: `https://github.com/${args.repo_owner}/${args.repo_name}/pulls/${pr_num}/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e`,
          number: pr_num,
          state: 'open',
          title: args.pr?.msg_title ?? '',
          body: args.pr?.msg_body ?? '',
          created_at: new Date().toISOString(),
          commits: 1,
          additions: 1,
          deletions: 0,
          changed_files: 1,
        },
      }
      return result
    }
    return result
  }
}
