import { Command } from 'commander'
import { project, generate } from '../lib'
import dayjs from 'dayjs'
import { util } from '../util'
import { R3plySiteConfig } from '@r3ply/schema/config'
import { BaseCmdOptions } from '..'
import tty from '../tty'
import { mailbox } from 'typescript-mailbox-parser'
import { Result } from 'oxide.ts'

type GenerateSignetCmdOpts = {
  site: string
  r3ply: string
  date: string
  interactive: boolean
  label: string
}

type GenerateConfigCmdOpts = {
  site: string
  r3ply: string
  date: string
  label: string
  comments: string
  moderation: string
  verbose: boolean
}

type GenerateEmailCmdOpts = {
  from?: string
  to?: string
  date: string
  subject?: string
  body?: string
  messageId?: string
}

type GenerateMailtoOpts = {
  to: string[]
  subject?: string
  cc: string[]
  bcc: string[]
}

function generate_cmd(cwd: string) {
  const generate_cmd = new Command('generate').description(
    'generate useful text',
  )

  const config_cmd = generate_cmd
    .command('config')
    .description('generate a config')
    .option('--site <domain>', `site domain`, project.DEFAULT_SITE_DOMAIN)
    .option(
      '--r3ply <r3ply domain>',
      `r3ply domain`,
      project.DEFAULT_R3PLY_DOMAIN,
    )
    .option(
      '--date <YYYY-MM-DD>',
      'date signet issued',
      dayjs().format('YYYY-MM-DD'),
    )
    .option(
      '--label <string>',
      'e.g. "prod", "test"',
      project.DEFAULT_CLI_SIGNET_LABEL,
    )
    .option('--comments <comment-source>', 'options are: email', 'email')
    .option('--moderation <channel>', 'See below', 'local')
    .addHelpText(
      'after',
      `\nModeration <channel> options: <github | webhook | local>`,
    )
    .option('--verbose', 'include more defaults explicitly', false)
    .action(async (options: GenerateConfigCmdOpts) => {
      const parent_opts = generate_cmd.parent!.opts<BaseCmdOptions>()
      return generate_config(cwd, { ...options, ...parent_opts })
    })

  const mailto_cmd = generate_cmd
    .command('mailto [body]')
    .description('generate a one-off `mailto:` link')
    .option('--to <email>', 'to header of email', util.collect_opts, [])
    .option('--subject <string>', 'subject header of email')
    .option('--cc <email>', 'cc header of email', util.collect_opts, [])
    .option('--bcc <email>', 'bcc header of email', util.collect_opts, [])
    .action(async (body: string, options: GenerateMailtoOpts) => {
      return generate_mailto(body, options)
    })

  const signet_cmd = generate_cmd
    .command('signet')
    .description('get a signet issued')
    .option('--site <domain>', `site domain`, project.DEFAULT_SITE_DOMAIN)
    .option(
      '--r3ply <r3ply domain>',
      `r3ply domain`,
      project.DEFAULT_R3PLY_DOMAIN,
    )
    .option('--date <YYYY-MM-DD>', 'date issued', dayjs().format('YYYY-MM-DD'))
    .option(
      '--label <string>',
      'e.g. "prod", "test"',
      project.DEFAULT_CLI_SIGNET_LABEL,
    )
    .action(async (options: GenerateSignetCmdOpts) => {
      const parent_opts = generate_cmd.parent!.opts<BaseCmdOptions>()
      return generate_signet(cwd, { ...options, ...parent_opts })
    })

  const email_cmd = generate_cmd
    .command('email')
    .description('Generate a comment as an email, based on your config')
    .argument('[input]', 'Input text (can also accept pipe)')
    // Add email header options
    .option('--message-id <id>', 'Message-ID header')
    .option('--date <date>', 'Date header', 'now (UTC)')
    .option('--from <address>', 'From header')
    .option('--to <address>', 'To header')
    .option('--subject <url | path>', 'Email subject')
    .option('--body <text>', 'Email body')
    .action(
      async (input: string | undefined, options: GenerateEmailCmdOpts) => {
        const parent_opts = generate_cmd.parent!.opts<BaseCmdOptions>()
        return generate_email(cwd, input, { ...options, ...parent_opts })
      },
    )

  return generate_cmd
}

async function generate_config(
  cwd: string,
  options: GenerateConfigCmdOpts & BaseCmdOptions,
) {
  const site = await project.get_keys(cwd).then((keys) =>
    project.get_cli_system_config(cwd).then((system_config) => {
      return generate.signet(
        keys.signet_key,
        util.unsafeUnwrap(system_config),
        {
          domain: options.site,
          r3ply: options.r3ply,
          issued: options.date,
          label: options.label,
        },
      )
    }),
  )
  const minimal_comments_config = { [options.comments]: { enabled: true } }
  const minimal_github_config = {
    owner: '<YOUR_GITHUB_USERNAME>',
    repo: '<YOUR_PROJECT>',
    'file_path_{}': 'comment_{{ comment.id[:8] }}.json',
  }
  const minimal_webhook_config = {
    url: 'https://TODO',
  }
  const minimal_local_config = {
    'file_path_{}': 'comment_{{ comment.id[:8] }}.json',
  }
  const parsed = R3plySiteConfig({
    site: [{ ...site, label: options.label }],
    // if --verbose is false it's removed later (set here to preserve desired key order for TOML)
    comments: minimal_comments_config,
    moderation: {
      [options.moderation]: [
        (() => {
          if (options.moderation == 'github') {
            return minimal_github_config
          } else if (options.moderation == 'webhook') {
            return minimal_webhook_config
          } else if (options.moderation == 'local') {
            return minimal_local_config
          } else {
            throw new util.CLIError(`Unknown moderation type: ${options.moderation}`)
          }
        })(),
      ],
    },
  })

  const config_json = parsed.value! as any
  // Here if --verbose is not set then a more minimal comments key is generated
  if (options.verbose == false) {
    config_json.comments = minimal_comments_config
  }
  tty.cmds.generate.print_config(config_json, options.format)
  return
}

async function generate_mailto(
  body: string,
  { to, subject, cc, bcc }: GenerateMailtoOpts,
) {
  // If stdin is piped (not a TTY), read from it
  if (!process.stdin.isTTY) {
    body = await new Promise<string>((resolve, reject) => {
      let data = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (chunk) => (data += chunk))
      process.stdin.on('end', () => resolve(data))
      process.stdin.on('error', reject)
    })
  }

  function parse_email_addr(str: string) {
    const mb = mailbox(str)
    if (!mb.ok)
      throw new util.CLIError(
        `Invalid email '${str}', errors ${JSON.stringify(mb.errors)}`,
      )
    else {
      if (mb.name) {
        return `${mb.name} <${mb.addr}>`
      } else return mb.addr
    }
  }
  // to, cc, and bcc are arrays and always defined
  const params = {
    to: to.map(parse_email_addr).join(','),
    subject,
    cc: cc.map(parse_email_addr).join(','),
    bcc: bcc.map(parse_email_addr).join(','),
    body: body ? body.replace(/\r?\n/g, '\r\n') : undefined,
  }

  // create URL encoded query string
  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `?${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join('&')

  // output result
  tty.cmds.generate.print_mail_to_link(query)
}

async function generate_signet(
  cwd: string,
  options: GenerateSignetCmdOpts & BaseCmdOptions,
) {
  const keys = await project.get_keys(cwd)
  const cli_system_config = util.unsafeUnwrap(
    await project.get_cli_system_config(cwd),
  )
  const signet = await generate.signet(keys.signet_key, cli_system_config, {
    domain: options.site,
    r3ply: options.r3ply,
    issued: options.date,
    label: options.label,
  })

  tty.cmds.generate.print_signet(signet, options.format)
}

async function generate_email(
  cwd: string,
  input: string | undefined,
  options: GenerateEmailCmdOpts & BaseCmdOptions,
) {
  if (options.date == 'now (UTC)') options.date = new Date().toUTCString()
  let site_config: R3plySiteConfig = await project.resolve_config(
    cwd,
    options.config,
  )

  const site = site_config.site[util.random_int(site_config.site.length)]

  // If no argument, check for piped input
  if (!input && !process.stdin.isTTY) {
    input = await util.read_stdin()
  }

  const email = Result.safe(
    // --body overrides input
    generate.email(site.domain, site.r3ply, { body: input, ...options }),
  )
  await email.then(async (email) => {
    if (email.isOk()) {
      tty.cmds.generate.print_email(email.unwrap())
    } else {
      throw email.unwrapErr()
    }
  })
}

export default generate_cmd
export { GenerateConfigCmdOpts, GenerateSignetCmdOpts, GenerateEmailCmdOpts }
