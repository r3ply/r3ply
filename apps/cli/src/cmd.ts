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
export function validate_cmd(cwd: string) {
  const validate_cmd = new Command('validate').description(
    'various supporting operations for working with r3ply configs',
  )
  validate_cmd
    .description('validate the configuration')
    .action(async (options: { config: string }) => {
      const site_config = util.unsafeUnwrap(
        await project.parse_site_config(
          cwd,
          validate_cmd.parent?.opts().config,
        ),
      )
      if (!site_config.valid)
        throw new Error(
          `config failed validation:\n\n${JSON.stringify(site_config.errors, null, 2)}`,
        )
    })

  return validate_cmd
}

// comments --------------------------------------------------------------------
export function comment_cmd(cwd: string) {
  const comment_cmd = new Command('comment').description(
    'various supporting operations for working with r3ply comments',
  )
  const generate_cmd = comment_cmd
    .command('generate')
    .description('generate a comment using your r3ply config')

  generate_cmd
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
        if (comment_cmd.parent?.opts().config) {
          site_config = util.unsafeUnwrap(
            await project.get_site_config(
              cwd,
              comment_cmd.parent?.opts().config,
            ),
          )
        } else {
          const project_dir = (await project.find_project_dir(cwd)).unwrap()
          site_config = util.unsafeUnwrap(
            await project.get_site_config(project_dir, undefined),
          )
        }
        const email = Result.safe(
          generate.email(
            site_config.domains[util.random_int(site_config.domains.length)],
            site_config.r3ply[util.random_int(site_config.r3ply.length)],
            options,
          ),
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

  const simulate_cmd = comment_cmd
    .command('simulate')
    .description('simulate receiving a comment using your r3ply config')

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
        console.log(options)

        let site_config: R3plySiteConfig
        let site_config_path: string
        let file_resolver: (file_uri?: string) => Promise<string | undefined>
        if (comment_cmd.parent?.opts().config) {
          site_config = util.unsafeUnwrap(
            await project.get_site_config(
              cwd,
              comment_cmd.parent?.opts().config,
            ),
          )
          site_config_path = util.unsafeUnwrap(
            await project.get_site_config_path(
              cwd,
              comment_cmd.parent?.opts().config,
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
        domains = ${JSON.stringify(site_config.r3ply)}
        [[admin]]
        name = "Guybrush Threepwood"
        email = "guybrush@example.com"`)
        const cli_system_config = systemConfigParser(
          JSON.stringify(cli_system_config_toml),
        ).value!

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
  return comment_cmd
}
