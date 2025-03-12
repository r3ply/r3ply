import path from 'path'
import fs from 'fs'
import { Err, Ok, Result } from 'oxide.ts'
import { find_up, random_int, unsafeUnwrap } from './util.js'
import fg from 'fast-glob'

// file system -----------------------------------------------------------------

const R3PLY_DIR = '.r3ply'
const CONFIG_GLOB_PATTERNS = [`**/r3ply/config.{toml,json}`, `**/r3ply.config.{toml,json}`]

export async function find_r3ply_dir(cwd: string): Promise<Result<string, Error>> {
  const find_result = find_up('.r3ply', cwd).then((path) => {
    if (path) return path
    else throw new Error(`No ${R3PLY_DIR} directory found. ${chalk.yellow(`You can run \`re init\` to initialize one.`)}`)
  })
  return Result.safe(find_result)
}

export async function find_config_files(cwd: string, file_name?: string): Promise<Result<string[], Error>> {
  return Result.safe(fg.async(CONFIG_GLOB_PATTERNS, { dot: true, cwd: cwd }))
}

export async function init_r3ply_project_at(cwd: string, dir: string): Promise<Result<void, Error>> {
  const new_r3ply_dir = path.join(cwd, dir, R3PLY_DIR)
  return Result.safe(
    fs.promises.mkdir(new_r3ply_dir).then(() => {
      // TODO: in the CLI print to the console:
      // console.log(`Initialized empty r3ply project in ${new_r3ply_dir}`)
    }),
  )
}

import TOML from '@iarna/toml'
import { R3plySiteConfig, siteConfigParser, systemConfigParser } from '@r3ply/config'
import { ParseResult } from '@exodus/schemasafe'
import chalk from 'chalk'

type TypedParseResult<T> = Omit<ParseResult, 'value'> & { value?: T }

export async function get_site_config(cwd: string, config_path?: string): Promise<Result<TypedParseResult<R3plySiteConfig>, Error>> {
  const site_config = find_r3ply_dir(cwd)
    // find project dir
    .then((r3ply_dir) => path.dirname(unsafeUnwrap(r3ply_dir)))
    // find config file or pass in
    .then((project_dir) => {
      if (config_path) return Result.safe(Promise.resolve([config_path]))
      else return find_config_files(cwd)
    })
    // parse config file
    .then((site_config_paths) => {
      // can't do anything if there is no file
      if (unsafeUnwrap(site_config_paths).length == 0) {
        throw new Error('No r3ply config found.')
      }
      // haven't decided what to do if there are multiple files, so forbid it for now
      else if (unsafeUnwrap(site_config_paths).length > 1) {
        const files_found = JSON.stringify(unsafeUnwrap(site_config_paths), null, 2)
        const help = '(You can specify a r3ply config as an optional argument)'
        throw new Error(`Multiple r3ply configs found:\n\n${chalk.red(files_found)}\n\n${chalk.yellow(help)}`)
      }
      // if there's just one file then proceed
      const site_config_path = unsafeUnwrap(site_config_paths)[0]
      return (
        fs.promises
          .readFile(path.join(cwd, site_config_path))
          // turn config file bytes into a string
          .then((site_config_bytes) => site_config_bytes.toString())
          // parse the file as TOML or as JSON depending on the file extension (note: if neither than an error will occur)
          .then((site_config_str) => (site_config_path.endsWith('.toml') ? TOML.parse(site_config_str) : JSON.parse(site_config_str)))
      )
    })
    // Finally return a parse result of the site config (which can still have errors related to the config's validity)
    .then((site_config_json) => siteConfigParser(JSON.stringify(site_config_json)))
  return Result.safe(site_config)
}

// r3ply library ---------------------------------------------------------------
import { RiMarkov, RiTa } from 'rita'
import { fileURLToPath } from 'url'
import { R3ply } from '@r3ply/lib'

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

const markov = RiTa.markov(2, { text: ['example.com', 'foo.com', 'foobar.com', 'monkeyisland.net'] })

import dayjs  from 'dayjs'

export function generate_date(floor: number = Math.floor(Date.now() / 1000) - 315360000, ceiling: number = Math.floor(Date.now() / 1000)) {
    return dayjs(new Date(random_int(ceiling, floor) * 1000)).format("ddd, DD MMM YYYY HH:mm:ss Z");
}

export function generate_email_addr() {
  const first = first_names[random_int(first_names.length)]
  const last = last_names[random_int(last_names.length)]
  const birthyear = random_int(1990, 1899)
  const domain = `${domains[random_int(domains.length)]}.${tlds[random_int(tlds.length)]}`
  const local = `${first}.${Math.random() > 0.5 ? birthyear : last}`
  const addr = `${local}@${domain}`
  const mailbox = `${first} ${last} <${addr}>`
  return { first, last, birthyear, domain, local, addr, mailbox }
}

export function generate_message_id(domain: string) {
  return `<${crypto.randomUUID()}@${domain}>`
}

export function generate_subject(url: URL) {
  const site_path = site_paths[random_int(0, site_paths.length)]
  const site_slug = site_slugs[random_int(0, site_slugs.length)]
  return new URL(path.join(site_path, site_slug), url).href
}

export function generate_comment_body(seed?: string[]) {
  // use meta imports to determine where the model file is stored
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const modelPath = path.join(__dirname, 'comments-markov-model.json')

  // load the model into markov chain and generate text
  const model_data = fs.promises.readFile(modelPath, 'utf-8')
  const markov = model_data.then((model_data) => RiMarkov.fromJSON(model_data))
  return markov.then((markov) =>
    markov.generate({
      maxLength: 128,
      temperature: 1,
      allowDuplicates: true,
      seed,
    }),
  )
}

export async function generate_email(
  site_domain: string,
  r3ply_domains: string[],
  options?: { messageId?: string; date?: string; from?: string; to?: string; subject?: string; body?: string },
) {
  const from = generate_email_addr()
  const [local, domain] = from.addr.match(/^(.+?)@(.+?)$/)!.slice(1, 3)
  const message_id = options?.messageId || generate_message_id(domain)
  const date = options?.date || generate_date()
  const to = options?.to || `${site_domain}@${r3ply_domains[random_int(r3ply_domains.length)]}`
  const subject = options?.subject || generate_subject(new URL(`https://${site_domain}/`))
  const body = options?.body || (await generate_comment_body())
  return `Date: ${date}
From: ${Math.random() > 0.5 ? from.addr : from.mailbox}
To: ${to}
Message-Id: ${message_id}
Subject: ${subject}

${body}
`
}

export async function cli_handle_comment_via_email(site_config: R3plySiteConfig, email_bytes: Uint8Array) {
  const cli_system_config = systemConfigParser(JSON.stringify(TOML.parse(`
version  = "0.0.1"
domain = "r3ply.com"
[[admin]]
name = "Guybrush Threepwood"
email = "guybrush@example.com"`))).value!
  const r3ply = R3ply(cli_system_config)
  const redact = async (input: string) => {
    const hashedBuffer = await crypto.subtle.digest({ name: 'SHA-256' }, new TextEncoder().encode(input))
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashedBuffer)))
    return hashBase64
  }
  const comment_via_email_handler = r3ply.comments.viaEmail(redact)
  return comment_via_email_handler([site_config, email_bytes])
}