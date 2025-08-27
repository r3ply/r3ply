import { Command } from 'commander'
import { cli_handle_comment_via_email, project, generate } from './lib.js'
import { util } from './util.js'
import { Result } from 'oxide.ts'
import chalk from 'chalk'
import { R3plySiteConfig, systemConfigParser } from '@r3ply/config'
import path from 'path'
import { resolve_config_references } from '@r3ply/lib'
import { highlight } from 'cli-highlight'
import TOML from '@iarna/toml'
import { Signet } from '@r3ply/lib'
import crypto from 'crypto'

// init ------------------------------------------------------------------------
export function init_cmd(cwd: string) {
  const init_cmd = new Command('init')
    .description('initialize a new r3ply project')
    // TODO:
    // .option('-f, --force', 'override existing initialization')
    .argument(
      '[directory]',
      'directory to initialize bare r3ply project within',
    )
    .action(async (directory) => {
      return project
        .init_r3ply_project_at(cwd, directory)
        .then(async (result) => {
          const { r3ply_dir, signet_key } = util.unsafeUnwrap(result)
          const { signet, issued } = await Signet.issue(signet_key)(
            project.DEFAULT_SITE_DOMAIN,
            project.DEFAULT_R3PLY_DOMAIN,
          )
          const toml_site_entry = `[[site]]
domain = "${project.DEFAULT_SITE_DOMAIN}"
r3ply = "${project.DEFAULT_R3PLY_DOMAIN}"
signet = "${signet}"
issued = ${issued}
`
          console.log(
            `Initialized empty r3ply project at ${chalk.greenBright(path.dirname(r3ply_dir))}`,
            `\n\nAdd the following site entry to your config:`,
            `\n\n${highlight(toml_site_entry, { language: 'toml' })}`,
          )
        })
    })

  return init_cmd
}

// config ----------------------------------------------------------------------
export function config_cmd(cwd: string) {
  const config_cmd = new Command('config').description('r3ply config commands')
  const validate_cmd = config_cmd
    .command('validate')
    .description('validate your r3ply configuration')
    .action(async () => {
      const site_config = util.unsafeUnwrap(
        await project.parse_site_config(cwd, config_cmd.parent?.opts().config),
      )
      if (!site_config.valid)
        throw new Error(
          `config failed validation:\n\n${JSON.stringify(site_config.errors, null, 2)}`,
        )
    })

  // TODO:
  // const generate_cmd = config_cmd
  // .command('generate')
  // .description('generate a config')
  // .option('-i, --interactive', 'generate the config interactively')
  // .option('--domain', 'the domain that this config will be hosted on')
  // .option('--r3ply', 'the domain the site will expect comments from')
  // .option('--signet', '')
  // .option('--issued')
  // .action('')

  return config_cmd
}

// generate --------------------------------------------------------------------

export function generate_cmd(cwd: string) {
  const generate_cmd = new Command('generate').description(
    'generate useful text',
  )

  const mailto_cmd = generate_cmd
    .command('mailto [body]')
    .description('generate a one-off `mailto:` link')
    .option('--to <email>', 'to header of email', util.collect_opts, [])
    .option('--subject <string>', 'subject header of email')
    .option('--cc <email>', 'cc header of email', util.collect_opts, [])
    .option('--bcc <email>', 'bcc header of email', util.collect_opts, [])
    .action(
      async (body, options: { to: []; subject?: string; cc: []; bcc: [] }) => {
        const { to, subject, cc, bcc } = options

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

        // to, cc, and bcc are arrays and always defined
        const params = {
          to: to.join(','),
          subject,
          cc: cc.join(','),
          bcc: bcc.join(','),
          body: body ? body.replace(/\r?\n/g, '\r\n') : undefined,
        }

        // create URL encoded query string
        const query = Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
          .join('&')

        // output result
        console.log(`mailto:${query ? `?${query}` : ''}`)
      },
    )

  const email_cmd = generate_cmd
    .command('email')
    .description('generate a comment as an email, based on your config')
    // Add email header options
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <text>', 'override email subject')
    .option('--body <text>', 'override email body')
    .action(
      async (options: {
        from?: string
        to?: string
        date?: string
        subject?: string
        body?: string
        messageId?: string
      }) => {
        let site_config: R3plySiteConfig
        if (generate_cmd.parent?.opts().config) {
          site_config = util.unsafeUnwrap(
            await project.get_site_config(
              cwd,
              generate_cmd.parent?.opts().config,
            ),
          )
        } else {
          const project_dir = (await project.find_project_dir(cwd)).unwrap()
          site_config = util.unsafeUnwrap(
            await project.get_site_config(project_dir, undefined),
          )
        }

        const site = site_config.site[util.random_int(site_config.site.length)]

        const email = Result.safe(
          generate.email(site.domain, site.r3ply, options),
        )
        await email.then(async (email) => {
          if (email.isOk()) {
            console.log(highlight(email.unwrap(), { language: 'yaml' }))
          } else {
            throw email.unwrapErr()
          }
        })
      },
    )

  return generate_cmd
}

// simulate --------------------------------------------------------------------

export function simulate_cmd(cwd: string) {
  const simulate_cmd = new Command('simulate').description(
    'simulate receiving a comment using your r3ply config',
  )

  simulate_cmd
    .command('email')
    // Add email header options
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <text>', 'override email subject')
    .option('--body <text>', 'override email body')
    .action(
      async (
        options: {
          from?: string
          to?: string
          date?: string
          subject?: string
          body?: string
          messageId?: string
        },
        cmd,
      ) => {
        let site_config: R3plySiteConfig
        let site_config_path: string
        let file_resolver: (file_uri?: string) => Promise<string | undefined>
        if (simulate_cmd.parent?.opts().config) {
          site_config = util.unsafeUnwrap(
            await project.get_site_config(
              cwd,
              simulate_cmd.parent?.opts().config,
            ),
          )
          site_config_path = util.unsafeUnwrap(
            await project.get_site_config_path(
              cwd,
              simulate_cmd.parent?.opts().config,
            ),
          )
          file_resolver =
            project.resolve_file_relative_to_site_config(site_config_path)
        } else {
          const project_dir = (await project.find_project_dir(cwd)).unwrap()
          site_config = util.unsafeUnwrap(
            await project.get_site_config(project_dir, undefined),
          )
          site_config_path = util.unsafeUnwrap(
            await project.get_site_config_path(project_dir, undefined),
          )
          file_resolver =
            project.resolve_file_relative_to_site_config(site_config_path)
        }
        site_config = await resolve_config_references(
          site_config,
          site_config_path,
          project.dereference_local_file,
        )
        const cli_system_config_toml = TOML.parse(`
        version  = "0.0.1"
        domains = ${JSON.stringify(site_config.site.map((s) => s.r3ply))}
        [[admin]]
        name = "Guybrush Threepwood"
        email = "guybrush@example.com"`)
        const cli_system_config = systemConfigParser(
          JSON.stringify(cli_system_config_toml),
        ).value!

        const site = ((to: string | undefined) => {
          let site_domain = to ? to.split('@')[0] : project.DEFAULT_SITE_DOMAIN
          const site = site_config.site.find((k) => k.domain == site_domain)
          if (site) {
            return site
          } else {
            return site_config.site[util.random_int(site_config.site.length)]
          }
        })(options.to)
        const email = generate
          .email(site.domain, site.r3ply, options)
          .then((email) => {
            // TODO: for some reason highlight.js doesn't support `eml`???
            console.log(
              `${chalk.whiteBright('=== Input Email ===\n')}`,
              '\n' +
                highlight(email.replace(/\r/g, ''), {
                  language: 'yaml',
                  ignoreIllegals: true,
                }) +
                '\n\n',
            )
            return email
          })
        const keys = await project.get_keys(cwd)
        const response = Result.safe(
          email.then((email) =>
            cli_handle_comment_via_email(
              cli_system_config,
              site_config,
              new TextEncoder().encode(email),
              file_resolver,
              {
                signet: keys.signet_key,
                encrypt_email: keys.encrypt_email_key,
              },
            ),
          ),
        )
        await response.then(async (response) => {
          if (response.isOk()) {
            const email_event_response = response.unwrap()
            console.log(
              `${chalk.whiteBright('=== System Config ===\n')}`,
              '\n' +
                highlight(
                  `# Generated using site config \n${TOML.stringify(cli_system_config_toml)}`,
                  { language: 'toml', ignoreIllegals: true },
                ) +
                '\n',
            )
            console.log(
              `${chalk.whiteBright('=== Site Config ===\n')}`,
              `\n${highlight(
                `# From path ${site_config_path} \n${TOML.stringify(site_config)}`,
                { language: 'toml', ignoreIllegals: true },
              )}`,
            )
            console.log(
              `${chalk.whiteBright('=== Prescreening Results ===')}\n`,
              `\n${highlight(
                TOML.stringify(email_event_response.prescreening as any),
                { language: 'toml', ignoreIllegals: true },
              )}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Comment Received ===')}\n`,
              `\n${highlight(
                TOML.stringify(email_event_response.received as any),
                { language: 'toml', ignoreIllegals: true },
              )}`,
            )
            const { email, ...deliverable_details } =
              email_event_response.deliverable
            console.log(
              `\n${chalk.whiteBright('=== Deliverability Details ===')}\n`,
              `\n${highlight('# Note: `From` is redacted\n' + TOML.stringify(deliverable_details as any), { language: 'toml', ignoreIllegals: true })}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Template Context ===')}\n`,
              `\n${highlight('# These are the values available to your templates\n' + TOML.stringify(email_event_response.prepared as any), { language: 'toml', ignoreIllegals: true })}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Comment ===')}\n`,
              `\n${highlight(email_event_response.comment as any)}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Moderation Args ===')}\n`,
              `\n${highlight('# These are the arguments used for moderation, alongside the comment\n' + TOML.stringify(email_event_response.moderation?.args as any), { language: 'toml', ignoreIllegals: true })}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Notification Context ===')}\n`,
              `\n${highlight('# These values are available within notification templates\n' + TOML.stringify(email_event_response.moderation?.context as any), { language: 'toml', ignoreIllegals: true })}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Comment Submitted Notification ===')}\n`,
              `\n${highlight(email_event_response.moderation?.commenter_notif ?? 'none', { languageSubset: ['md', 'html', 'txt'], ignoreIllegals: true })}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Comment Received Notification ===')}\n`,
              `\n${highlight(email_event_response.moderation?.moderator_notif ?? 'none', { languageSubset: ['md', 'html', 'txt'], ignoreIllegals: true })}`,
            )
          } else {
            throw response.unwrapErr()
          }
        })
      },
    )
  return simulate_cmd
}
