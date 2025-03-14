import { Command } from 'commander'
import { cli_handle_comment_via_email, generate_comment_body, generate_email, get_site_config } from './lib.js'
import { unsafeUnwrap } from './util.js'
import { Result } from 'oxide.ts'
import chalk from 'chalk'

// config ----------------------------------------------------------------------
export function config_cmd(cwd: string) {
  const config_cmd = new Command('config').description('various supporting operations for working with r3ply configs')

  config_cmd
    .command('validate [config_path]')
    .description('validate the configuration')
    .action(async (config_path?: string) => {
      const site_config = unsafeUnwrap(await get_site_config(cwd, config_path))
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
      async (options: { config: string; from: string; to: string; date: string; subject: string; body: string; messageId: string }) => {
        const site_config = unsafeUnwrap(await get_site_config(cwd, options.config)).value!
        const email = generate_email(site_config.domain, site_config.r3ply, options).then(email => {
          console.log(`Input email:\n\n${chalk.blueBright(wrapText(email, 78))}`)
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

function wrapText(text: string, width: number): string {
  const regex = new RegExp(`(.{1,${width}})(\\s+|$)`, "g");
  return text.match(regex)?.join("\n") || text;
}
