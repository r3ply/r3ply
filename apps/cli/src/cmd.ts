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

// init ------------------------------------------------------------------------
export function init_cmd(cwd: string) {
  const config_cmd = new Command('init')
    .description('initialize a new r3ply project')
    .argument(
      '[directory]',
      'directory to initialize bare r3ply project within',
    )
    .action(async (directory) => {
      return project.init_r3ply_project_at(cwd, directory).then((r3ply_dir) => {
        console.log(
          `Initialized empty r3ply project at ${chalk.greenBright(path.dirname(util.unsafeUnwrap(r3ply_dir)))}`,
        )
      })
    })

  return config_cmd
}

// config ----------------------------------------------------------------------
export function config_cmd(cwd: string) {
  const config_cmd = new Command('config').description(
    'various supporting operations for working with r3ply configs',
  )

  config_cmd
    .command('validate')
    .description('validate the configuration')
    .option('--config <path>', 'specify path to config')
    .action(async (options: { config: string }) => {
      const site_config = util.unsafeUnwrap(
        await project.parse_site_config(cwd, options.config),
      )
      if (!site_config.valid)
        throw new Error(
          `config failed validation:\n\n${JSON.stringify(site_config.errors, null, 2)}`,
        )
    })

  return config_cmd
}

// comments --------------------------------------------------------------------
export function comments_cmd(cwd: string) {
  const comments_cmd = new Command('comments').description(
    'various supporting operations for working with r3ply comments',
  )
  comments_cmd
    .command('generate')
    .description('generate an email inspired off current r3ply config')
    .option('--config <config-path>', 'specify path to config')
    // Add email header options
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <text>', 'override email subject')
    .option('--body <text>', 'override email body')
    .action(
      async (options: {
        config?: string
        from?: string
        to?: string
        date?: string
        subject?: string
        body?: string
        messageId?: string
      }) => {
        let site_config: R3plySiteConfig
        if (options.config) {
          site_config = util.unsafeUnwrap(
            await project.get_site_config(cwd, options.config),
          )
        } else {
          const project_dir = (await project.find_project_dir(cwd)).unwrap()
          site_config = util.unsafeUnwrap(
            await project.get_site_config(project_dir, undefined),
          )
        }
        site_config = util.unsafeUnwrap(
          await project.get_site_config(cwd, options.config),
        )
        const email = Result.safe(
          generate.email(
            site_config.domains[util.random_int(site_config.domains.length)],
            site_config.r3ply[util.random_int(site_config.r3ply.length)],
            options,
          ),
        )
        await email.then(async (email) => {
          if (email.isOk()) {
            console.log(`${chalk.blueBright(email.unwrap())}`)
          } else {
            throw email.unwrapErr()
          }
        })
      },
    )

  comments_cmd
    .command('simulate-email')
    .description(
      'simulate receiving a comment via email with your current r3ply config',
    )
    .option('--config <config-path>', 'specify path to config')
    // Add email header options
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <text>', 'override email subject')
    .option('--body <text>', 'override email body')
    .action(
      async (options: {
        config?: string
        from?: string
        to?: string
        date?: string
        subject?: string
        body?: string
        messageId?: string
      }) => {
        let site_config: R3plySiteConfig
        let site_config_path: string
        let file_resolver: (file_uri?: string) => Promise<string | undefined>
        if (options.config) {
          site_config = util.unsafeUnwrap(
            await project.get_site_config(cwd, options.config),
          )
          site_config_path = util.unsafeUnwrap(
            await project.get_site_config_path(cwd, options.config),
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
        domains = ${JSON.stringify(site_config.r3ply)}
        [[admin]]
        name = "Guybrush Threepwood"
        email = "guybrush@example.com"`)
        const cli_system_config = systemConfigParser(
          JSON.stringify(cli_system_config_toml),
        ).value!
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
          '\n' +
            highlight(
              `# From path ${site_config_path} \n${TOML.stringify(site_config)}`,
              { language: 'toml', ignoreIllegals: true },
            ) +
            '\n',
        )

        const email = generate
          .email(
            site_config.domains[util.random_int(site_config.domains.length)],
            site_config.r3ply[util.random_int(site_config.r3ply.length)],
            options,
          )
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
        const response = Result.safe(
          email.then((email) =>
            cli_handle_comment_via_email(
              cli_system_config,
              site_config,
              new TextEncoder().encode(email),
              file_resolver,
            ),
          ),
        )
        // TODO:
        // const msg_reply = createMimeMessage()
        // msg_reply.setHeader('In-Reply-To', msg.headers.get('Message-ID')!)
        // msg_reply.setSender(msg.to)
        // msg_reply.setRecipient(msg.from)
        // msg_reply.setSubject(msg.headers.get('Subject')!)
        // msg_reply.addMessage({
        //   contentType: 'text/plain',
        //   data: `Hello, world!`,
        // })
        await response.then(async (response) => {
          if (response.isOk()) {
            const email_event_response = response.unwrap()
            console.log(
              `${chalk.whiteBright('=== Prescreening Results ===')}\n`,
              '\n' +
                highlight(
                  TOML.stringify(email_event_response.prescreening as any),
                  { language: 'toml', ignoreIllegals: true },
                ),
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
              `\n${highlight('# Note: `From` is redacted\n' + TOML.stringify(deliverable_details as any))}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Template Context ===')}\n`,
              `\n${highlight('# Note: these are the values available to your templates\n' + TOML.stringify(email_event_response.prepared as any))}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Comment ===')}\n`,
              `\n${highlight(email_event_response.comment as any)}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Moderation Args ===')}\n`,
              `\n${highlight(TOML.stringify(email_event_response.moderation?.args as any))}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Notification Context ===')}\n`,
              `\n${highlight(TOML.stringify(email_event_response.moderation?.context as any))}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Commenter Notification ===')}\n`,
              `\n${highlight(email_event_response.moderation?.commenter_notif ?? 'none')}`,
            )
            console.log(
              `\n${chalk.whiteBright('=== Moderator Notification ===')}\n`,
              `\n${highlight(email_event_response.moderation?.moderator_notif ?? 'none')}`,
            )
          } else {
            throw response.unwrapErr()
          }
        })
      },
    )
  return comments_cmd
}
