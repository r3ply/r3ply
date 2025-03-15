import path from 'path'
import fs from 'fs'
import { Err, Ok, Result } from 'oxide.ts'
import { util } from './util.js'
import fg from 'fast-glob'
import TOML from '@iarna/toml'
import {
  R3plySiteConfig,
  siteConfigParser,
  systemConfigParser,
} from '@r3ply/config'
import { ParseResult } from '@exodus/schemasafe'
import chalk from 'chalk'
import { RiMarkov, RiTa } from 'rita'
import { fileURLToPath } from 'url'
import { R3ply } from '@r3ply/lib'
import dayjs from 'dayjs'
import { build_email } from '@r3ply/wasm'

// project stuff ---------------------------------------------------------------
export namespace project {
  type TypedParseResult<T> = Omit<ParseResult, 'value'> & { value?: T }
  const R3PLY_DIR = '.r3ply'
  const CONFIG_GLOB_PATTERNS = [
    `**/r3ply/config.{toml,json}`,
    `**/r3ply.config.{toml,json}`,
  ]

  export async function find_r3ply_dir(
    cwd: string,
  ): Promise<Result<string, Error>> {
    const find_result = util.find_up('.r3ply', cwd).then((path) => {
      if (path) return path
      else
        throw new Error(
          `No ${R3PLY_DIR} directory found. ${chalk.yellow(`You can run \`re init\` to initialize one.`)}`,
        )
    })
    return Result.safe(find_result)
  }

  export async function find_project_dir(
    cwd: string,
  ): Promise<Result<string, Error>> {
    return find_r3ply_dir(cwd).then((r3ply_dir) => {
      return r3ply_dir.map((r3ply_dir) => path.dirname(r3ply_dir))
    })
  }

  export async function find_config_files(
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

  export async function get_site_config_path(
    cwd: string,
    config_path?: string,
  ) {
    const full_config_path = (async () => {
      const project_dir = util.unsafeUnwrap(await find_project_dir(cwd))
      if (config_path) {
        const relative_files = util.unsafeUnwrap(
          await find_config_files(cwd, config_path),
        )
        if (relative_files.length == 0)
          throw new Error(`No config found at ${path.join(cwd, config_path)}`)
        else if (relative_files.length > 1)
          throw new Error(
            `Multiple matches found: ${JSON.stringify(relative_files, null, 2)}`,
          )
        else return path.join(cwd, relative_files[0])
      } else {
        const relative_files = util.unsafeUnwrap(
          await find_config_files(project_dir),
        )
        if (relative_files.length == 0)
          throw new Error(`No r3ply config found within ${project_dir}`)
        else if (relative_files.length > 1)
          throw new Error(
            `Multiple matches found: ${JSON.stringify(relative_files, null, 2)}`,
          )
        else return path.join(project_dir, relative_files[0])
      }
    })()
    return Result.safe(full_config_path)
  }

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
          .then((site_config_json) =>
            siteConfigParser(JSON.stringify(site_config_json)),
          )
      })
    return Result.safe(parsed_site_config)
  }

  export async function get_site_config(
    cwd: string,
    config_path?: string,
  ): Promise<Result<R3plySiteConfig, Error>> {
    const site_config = parse_site_config(cwd, config_path)
      .then((parsed_site_config) => util.unsafeUnwrap(parsed_site_config))
      .then((parsed_site_config) => parsed_site_config.value!)
    return Result.safe(site_config)
  }

  // TODO:
  export async function init_r3ply_project_at(
    cwd: string,
    dir?: string,
  ): Promise<Result<string, Error>> {
    const new_r3ply_dir = path.join(cwd, dir ?? '', R3PLY_DIR)
    const parent_project_exists = find_r3ply_dir(new_r3ply_dir)
    const initialize_project = parent_project_exists.then(
      (parent_project_exists) => {
        const file_access = Result.safe(fs.promises.access(new_r3ply_dir))
        return file_access.then((file_access) => {
          if (file_access.isErr()) {
            if (parent_project_exists.isOk())
              throw new Error(
                `Nested r3ply project. There is already a parent directory initialized at ${chalk.blue('`' + parent_project_exists.unwrap() + '`')}.${chalk.yellow('(Nested projects can lead to strange effects)')}`,
              )
            return fs.promises.mkdir(new_r3ply_dir).then(() => {
              return fs.promises
                .writeFile(
                  path.join(new_r3ply_dir, 'placeholder.txt'),
                  'This is just an empty file so the .r3ply directory is picked up by source control. In the future there will be more things to store here, so this file will be unnecessary.',
                )
                .then((_) => new_r3ply_dir)
            })
          } else {
            throw new Error(
              `Project already initialized at \`${chalk.reset(path.dirname(new_r3ply_dir))}\``,
            )
          }
        })
      },
    )
    return Result.safe(initialize_project)
  }
}

// r3ply library ---------------------------------------------------------------
const markov = RiTa.markov(2, {
  text: ['example.com', 'foo.com', 'foobar.com', 'monkeyisland.net'],
})

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
    const modelPath = path.join(__dirname, 'comments-markov-model.json')

    // load the model into markov chain and generate text
    const model_data = fs.promises.readFile(modelPath, 'utf-8')
    const markov = model_data.then((model_data) =>
      RiMarkov.fromJSON(model_data),
    )
    return markov.then((markov) =>
      markov.generate({
        maxLength: 128,
        temperature: 1,
        allowDuplicates: true,
        seed,
      }),
    )
  }

  export async function email(
    site_domain: string,
    r3ply_domains: string[],
    options?: {
      messageId?: string
      date?: string
      from?: string
      to?: string
      subject?: string
      body?: string
    },
  ) {
    let from: { name?: string; addr: string }
    if (options?.from) {
      from = parse_email_addr(options.from)
    } else {
      from = generate.email_addr()
    }
    const [local, domain] = from.addr.match(/^(.+?)@(.+?)$/)!.slice(1, 3)
    const message_id = options?.messageId || generate.message_id(domain)
    const date = dayjs(options?.date ?? new Date(generate.date()))
    const to =
      options?.to ||
      `${site_domain}@${r3ply_domains[util.random_int(r3ply_domains.length)]}`
    const subject =
      options?.subject || generate.subject(new URL(`https://${site_domain}/`))
    const body = options?.body || (await generate.comment_body())
    const email = Result.safe(() =>
      build_email(
        message_id,
        BigInt(date.unix()),
        from.name,
        from.addr,
        to,
        subject,
        body,
      ),
    )
    return email.unwrap()
  }

  // TODO: bring in my actual email parsing library to handle this stuff. This is not how an email address should be parsed!
  function parse_email_addr(email: string): { name?: string; addr: string } {
    const name_matches = email.match(/^(.*?)</)
    let name: string | undefined
    if (name_matches) {
      name = name_matches[1].trim()
      const email_matches = email.match(/<(.+?)>/)
      const email_addr = (email_matches! ?? [''])[1].trim()
      return { name, addr: email_addr }
    } else return { name: undefined, addr: email }
  }
}

export async function cli_handle_comment_via_email(
  site_config: R3plySiteConfig,
  email_bytes: Uint8Array,
) {
  const cli_system_config = systemConfigParser(
    JSON.stringify(
      TOML.parse(`
version  = "0.0.1"
domain = "r3ply.com"
[[admin]]
name = "Guybrush Threepwood"
email = "guybrush@example.com"`),
    ),
  ).value!
  const r3ply = R3ply(cli_system_config)
  const redact = util.sha256_0x
  const comment_via_email_handler = r3ply.comments.viaEmail(redact)
  return comment_via_email_handler([site_config, email_bytes])
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
const local_names = ['guybrush', 'bob', 'alice', 'lechuck', 'elaine', 'mallory']
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
