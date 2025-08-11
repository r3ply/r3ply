import { Command } from 'commander'
import { cli_handle_comment_via_email, project, generate } from './lib.js'
import { util } from './util.js'
import { Result } from 'oxide.ts'
import chalk from 'chalk'
import { R3plySiteConfig } from '@r3ply/config'
import path from 'path'

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
            site_config.r3ply,
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
        let file_resolver: (file_uri?: string) => Promise<string | undefined>
        if (options.config) {
          site_config = util.unsafeUnwrap(
            await project.get_site_config(cwd, options.config),
          )
          const site_config_path = util.unsafeUnwrap(
            await project.get_site_config_path(cwd, options.config),
          )
          file_resolver =
            project.resolve_file_relative_to_site_config(site_config_path)
        } else {
          const project_dir = (await project.find_project_dir(cwd)).unwrap()
          site_config = util.unsafeUnwrap(
            await project.get_site_config(project_dir, undefined),
          )
          const site_config_path = util.unsafeUnwrap(
            await project.get_site_config_path(project_dir, undefined),
          )
          file_resolver =
            project.resolve_file_relative_to_site_config(site_config_path)
        }
        const email = generate
          .email(
            site_config.domains[util.random_int(site_config.domains.length)],
            site_config.r3ply,
            options,
          )
          .then((email) => {
            console.log(
              `Input email:\n\n${chalk.blueBright(email.replace(/\r/g, ''))}`,
            )
            console.log(`\n${chalk.yellow('--------------------------')}\n`)
            return email
          })
        const comment = Result.safe(
          email.then((email) =>
            cli_handle_comment_via_email(
              site_config,
              new TextEncoder().encode(email),
              file_resolver,
            ),
          ),
        )
        await comment.then(async (comment) => {
          if (comment.isOk()) {
            console.log(
              `Output comment:\n\n${chalk.cyanBright(comment.unwrap())}`,
            )
          } else {
            throw comment.unwrapErr()
          }
        })
      },
    )
  return comments_cmd
}
