import { Command } from 'commander'
import { cli_handle_comment_via_email, project, generate } from './lib.js'
import { util } from './util.js'
import { Result } from 'oxide.ts'
import chalk from 'chalk'
import { R3plySiteConfig } from '@r3ply/config'

// config ----------------------------------------------------------------------
export function config_cmd(cwd: string) {
  const config_cmd = new Command('config').description('various supporting operations for working with r3ply configs')

  config_cmd
    .command('validate')
    .description('validate the configuration')
    .option('--config <path>', 'specify path to config')
    .action(async (options: { config: string }) => {
      const site_config = util.unsafeUnwrap(await project.parse_site_config(cwd, options.config))
      if (!site_config.valid) throw new Error(`config failed validation:\n\n${JSON.stringify(site_config.errors, null, 2)}`)
    })

  return config_cmd
}

// comments --------------------------------------------------------------------
export function comments_cmd(cwd: string) {
  const comments_cmd = new Command('comments').description('various supporting operations for working with r3ply comments')
  comments_cmd
    .command('simulate-email')
    .description('simulate receiving a comment via email with your current r3ply config')
    .option('--config <config-path>', 'specify path to config')
    // Add email header options
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <text>', 'override email subject')
    .option('--body <text>', 'override email body')
    .action(
      async (options: { config?: string; from?: string; to?: string; date?: string; subject?: string; body?: string; messageId?: string }) => {
        let site_config: R3plySiteConfig;
        if (options.config) {
          site_config = util.unsafeUnwrap(await project.get_site_config(cwd, options.config))
        } else {
          const project_dir = (await project.find_project_dir(cwd)).unwrap()
          site_config = util.unsafeUnwrap(await project.get_site_config(project_dir, undefined))
        }
        site_config = util.unsafeUnwrap(await project.get_site_config(cwd, options.config))
        const email = generate.email(site_config.domain, site_config.r3ply, options).then(email => {
          console.log(`Input email:\n\n${chalk.blueBright(email.replace(/\r/g, ""))}`)
          console.log(`\n${chalk.yellow("--------------------------")}\n`)
          return email
        })
        const comment = Result.safe(email.then(email => cli_handle_comment_via_email(site_config, new TextEncoder().encode(email))))
        await comment.then(async comment => {
          if (comment.isOk()) {
            console.log(`Output comment:\n\n${chalk.cyanBright(comment.unwrap())}`)
          } else {
            throw comment.unwrapErr()
          }
        })
      },
    )
  return comments_cmd
}