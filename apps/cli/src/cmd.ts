import { Command } from 'commander'
import { cli_handle_comment_via_email, project, generate } from './lib.js'
import { util } from './util.js'
import { Result } from 'oxide.ts'
import chalk from 'chalk'
import { R3plySiteConfig } from '@r3ply/schema'
import path from 'path'
import { highlight } from 'cli-highlight'
import TOML from '@iarna/toml'
import { Signet, util as r3ply_util } from '@r3ply/lib'
import prompts, { PromptObject } from 'prompts'
import dayjs from 'dayjs'

// init ------------------------------------------------------------------------
export function init_cmd(cwd: string) {
  const init_cmd = new Command('init')
    .description('initialize a new r3ply project (at current directory)')
    .action(async () => {
      return project.init_r3ply_project_at(cwd).then(async (result) => {
        const system_config = util.unsafeUnwrap(
          await project.get_cli_system_config(cwd),
        )
        const { r3ply_dir, signet_key } = util.unsafeUnwrap(result)
        const { signet, issued } = await Signet.issue(
          signet_key,
          system_config,
        )(project.DEFAULT_SITE_DOMAIN, project.DEFAULT_R3PLY_DOMAIN)
        const toml_site_entry = `[[site]]
domain = "${project.DEFAULT_SITE_DOMAIN}"
r3ply = "${project.DEFAULT_R3PLY_DOMAIN}"
signet = "${signet}"
issued = ${issued}
label = "local"
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
      const site_config_path = await project.resolve_config_path(
        cwd,
        config_cmd.parent?.opts().config,
      )
      const site_config = util.unsafeUnwrap(
        await project.parse_site_config(cwd, site_config_path),
      )
      if (!site_config.valid)
        throw new Error(
          `config failed validation:\n\n${JSON.stringify(site_config.errors, null, 2)}`,
        )
    })

  config_cmd
    .command('set-default <path>')
    .description('the default config path r3ply will use')
    .action(async (path) => {
      await project.set_default_cli_config_path(cwd, path)
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
      async (
        body,
        options: {
          to: string[]
          subject?: string
          cc: string[]
          bcc: string[]
        },
      ) => {
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
  function signet_questions(site: string, r3ply: string, date: string) {
    const signet_questions: PromptObject[] = [
      {
        type: 'text',
        name: 'site',
        message: 'To what domain will the signet be issued?',
        initial: site,
        validate: (site) =>
          Result.safe(() => new URL(`https://${site}`)).isOk(),
        format: (site) => new URL(`https://${site}`).hostname,
      },
      {
        type: 'text',
        name: 'r3ply',
        message: 'What r3ply domain will issue the signet?',
        initial: r3ply,
        validate: (r3ply) =>
          Result.safe(() => new URL(`https://${r3ply}`)).isOk(),
        format: (r3ply) => new URL(`https://${r3ply}`).hostname,
      },
      {
        type: 'text',
        name: 'date',
        message: 'What is the date of issue?',
        initial: date,
        validate: async (date) => {
          return dayjs(date).isValid()
        },
      },
    ]
    return signet_questions
  }
  const signet_cmd = generate_cmd
    .command('signet')
    .description('get a signet issued')
    .option(
      '--site <string>',
      `domain the signet is issued to (default: ${project.DEFAULT_SITE_DOMAIN})`,
      project.DEFAULT_SITE_DOMAIN,
    )
    .option(
      '--r3ply <string>',
      `domain of issuing r3ply server (default: ${project.DEFAULT_R3PLY_DOMAIN})`,
      project.DEFAULT_R3PLY_DOMAIN,
    )
    .option('--date <string>', 'date signet was issued (default: today)')
    .action(
      async (options: {
        site: string
        r3ply: string
        date?: string
        interactive: boolean
      }) => {
        const keys = await project.get_keys(cwd)
        const cli_system_config = util.unsafeUnwrap(
          await project.get_cli_system_config(cwd),
        )
        const signet = await generate.signet(
          keys.signet_key,
          cli_system_config,
          options.site,
          options.r3ply,
          options.date,
        )

        // TODO - add back in the interactive version once I've figured out an elegant UX for generating the config
        if (options.interactive) {
          const answers = await prompts(
            signet_questions(
              options.site,
              options.r3ply,
              options.date ?? dayjs().format('YYYY-MM-DD'),
            ),
          )
          options.site = answers.site
          options.r3ply = answers.r3ply
          options.date = answers.date
        }
        console.log(
          highlight(
            TOML.stringify({
              site: [signet],
            }),
          ),
        )
      },
    )

  const config_cmd = generate_cmd
    .command('config')
    .description('generate a config')
    .option(
      '--site <string>',
      `domain the signet is issued to (default: ${project.DEFAULT_SITE_DOMAIN})`,
      project.DEFAULT_SITE_DOMAIN,
    )
    .option(
      '--r3ply <string>',
      `domain of issuing r3ply server (default: ${project.DEFAULT_R3PLY_DOMAIN})`,
      project.DEFAULT_R3PLY_DOMAIN,
    )
    .option('--date <string>', 'date signet was issued (default: today)')
    .option(
      '--moderation <github | webhook>',
      'moderation method (default: github)',
      'github',
    )
    .action(async (options: { site: string; r3ply: string; date?: string }) => {
      const site = await project.get_keys(cwd).then((keys) =>
        project.get_cli_system_config(cwd).then((system_config) => {
          return generate.signet(
            keys.signet_key,
            util.unsafeUnwrap(system_config),
            options.site,
            options.r3ply,
            options.date,
          )
        }),
      )
      const minimal_github_config = {
        type: 'github',
        repo: 'https://github.com/<YOUR_USERNAME>/<YOUR_PROJECT>',
        'file_path_{}': '',
      }
      const minimal_config = {
        version: '0.0.1',
        site: [site],
        comments: {
          email: {
            moderation: {
              ...minimal_github_config,
            },
          },
        },
      }
      const parsed = R3plySiteConfig({
        site: [{ ...site, label: 'local' }],
        moderation: {
          local: [
            {
              'file_path_{}': '',
            },
          ],
        },
      })
      console.log(highlight(TOML.stringify(parsed.value as any)))
      return
    })

  const email_cmd = generate_cmd
    .command('email')
    .description('generate a comment as an email, based on your config')
    // Add email header options
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <url>', 'override email subject')
    .option('--subject-path <path>', 'override just path of subject')
    .option('--body <text>', 'override email body')
    .action(
      async (options: {
        from?: string
        to?: string
        date?: string
        subject?: string
        subjectPath?: string
        body?: string
        messageId?: string
      }) => {
        let site_config: R3plySiteConfig = await project.resolve_config(
          cwd,
          generate_cmd.parent?.opts().config,
        )
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
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <url>', 'override email subject')
    .option('--subject-path <path>', 'override just path of subject')
    .option('--body <text>', 'override email body')
    .option('--no-heading', 'hide headings for each stage of simulation', true)
    .option(
      '-q, --quiet [stage...]',
      `silence output at \`stages\` or all output if stages is blank. stages are: [email,config,prescreen,receive,deliverable,prepare,comment,moderate,notify]. Note: stages themselves can be further narrowed by adding an \`=\` after the stage name: [config=site,config=system,moderate=request,moderate=response,notify=commenter,notify=site]`,
      util.split_list,
    )
    .option(
      '-f, --filter [stage...]',
      `filter output at \`stages\` or all output if stages is blank. stages are: [email,config,prescreen,receive,deliverable,prepare,comment,moderate,notify]. Note: stages themselves can be further narrowed by adding an \`=\` after the stage name: [config=site,config=system,moderate=request,moderate=response,notify=commenter,notify=site]`,
      util.split_list,
    )
    .action(
      async (
        options: {
          from?: string
          to?: string
          date?: string
          subject?: string
          subjectPath?: string
          body?: string
          messageId?: string
          quiet?: boolean | string[]
          filter?: boolean | string[]
          heading: boolean
        },
        cmd,
      ) => {
        let site_config_path: string = await project.resolve_config_path(
          cwd,
          simulate_cmd.parent?.opts().config,
        )
        let site_config: R3plySiteConfig = await project.resolve_config(
          cwd,
          simulate_cmd.parent?.opts().config,
        )
        let file_resolver: (file_uri?: string) => Promise<string | undefined> =
          project.resolve_file_relative_to_site_config(site_config_path)
        site_config = await r3ply_util.config.resolve_references(
          site_config,
          site_config_path,
          project.dereference_local_file,
        )
        const cli_system_config = util.unsafeUnwrap(
          await project.get_cli_system_config(cwd),
        )
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
            if (util.print_w_quiet_and_filter_opts(options, 'email')) {
              // TODO: for some reason highlight.js doesn't support `eml`???
              if (options.heading)
                console.log(`${chalk.whiteBright('=== Input Email ===\n')}`)
              console.log(
                highlight(email.replace(/\r/g, ''), {
                  language: 'yaml',
                  ignoreIllegals: true,
                }) + '\n\n',
              )
            }
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
            if (util.print_w_quiet_and_filter_opts(options, 'config')) {
              if (
                util.print_w_quiet_and_filter_opts(options, 'config=system')
              ) {
                if (options.heading)
                  console.log(`${chalk.whiteBright('=== System Config ===\n')}`)
                console.log(
                  highlight(
                    `# Generated using site config \n${TOML.stringify(cli_system_config)}`,
                    { language: 'toml', ignoreIllegals: true },
                  ) + '\n',
                )
              }
              if (util.print_w_quiet_and_filter_opts(options, 'config=site')) {
                if (options.heading)
                  console.log(`${chalk.whiteBright('=== Site Config ===\n')}`)
                console.log(
                  `${highlight(
                    `# From path ${site_config_path} \n${TOML.stringify(site_config as any)}`,
                    { language: 'toml', ignoreIllegals: true },
                  )}`,
                )
              }
            }
            if (util.print_w_quiet_and_filter_opts(options, 'prescreen')) {
              if (options.heading)
                console.log(
                  `${chalk.whiteBright('=== Prescreening Results ===')}\n`,
                )
              console.log(
                `${highlight(
                  TOML.stringify(
                    email_event_response.prescreening.unwrapUnchecked() as any,
                  ),
                  { language: 'toml', ignoreIllegals: true },
                )}`,
              )
            }
            if (util.print_w_quiet_and_filter_opts(options, 'receive')) {
              console.log(
                `\n${chalk.whiteBright('=== Comment Received ===')}\n`,
                `\n${highlight(
                  TOML.stringify(email_event_response.received as any),
                  { language: 'toml', ignoreIllegals: true },
                )}`,
              )
            }
            // TODO: remove this
            // const { email, ...deliverable_details } = email_event_response.deliverable
            const deliverable_details =
              email_event_response.deliverable?.unwrapUnchecked()
            if (util.print_w_quiet_and_filter_opts(options, 'deliverable')) {
              if (options.heading)
                console.log(
                  `${chalk.whiteBright('=== Deliverability Details ===')}\n`,
                )
              console.log(
                `${highlight('# Note: `From` is redacted\n' + TOML.stringify(deliverable_details as any), { language: 'toml', ignoreIllegals: true })}`,
              )
            }
            if (util.print_w_quiet_and_filter_opts(options, 'prepare')) {
              if (options.heading)
                console.log(
                  `${chalk.whiteBright('=== Template Context ===')}\n`,
                )
              console.log(
                `${highlight('# These are the values available to your templates\n' + TOML.stringify(email_event_response.prepared?.unwrapUnchecked() as any), { language: 'toml', ignoreIllegals: true })}`,
              )
            }
            if (util.print_w_quiet_and_filter_opts(options, 'comment')) {
              if (options.heading)
                console.log(`${chalk.whiteBright('=== Comment ===')}\n`)
              console.log(
                `${highlight(email_event_response.comment?.unwrapUnchecked() as any)}`,
              )
            }
            // TODO: for now moderation and notifying need to be refactored
            // if (util.print_w_quiet_and_filter_opts(options, 'moderate')) {
            //   if (
            //     util.print_w_quiet_and_filter_opts(options, 'moderate=request')
            //   ) {
            //     if (options.heading)
            //       console.log(
            //         `${chalk.whiteBright('=== Moderation Args ===')}\n`,
            //       )
            //     console.log(
            //       `${highlight('# These are the arguments used for moderation, alongside the comment\n' + TOML.stringify(email_event_response.moderation?.args as any), { language: 'toml', ignoreIllegals: true })}`,
            //     )
            //   }
            //   if (
            //     util.print_w_quiet_and_filter_opts(options, 'moderate=response')
            //   ) {
            //     if (options.heading)
            //       `console.log`(
            //         `${chalk.whiteBright('=== Notification Context ===')}\n`,
            //       )
            //     console.log(
            //       `${highlight('# These values are available within notification templates\n' + TOML.stringify(email_event_response.moderation?.context as any), { language: 'toml', ignoreIllegals: true })}`,
            //     )
            //   }
            // }
            // if (util.print_w_quiet_and_filter_opts(options, 'notify')) {
            //   if (
            //     util.print_w_quiet_and_filter_opts(options, 'notify=commenter')
            //   ) {
            //     if (options.heading)
            //       console.log(
            //         `${chalk.whiteBright('=== Comment Submitted Notification ===')}\n`,
            //       )
            //     if (email_event_response.moderation?.commenter_notif)
            //       console.log(
            //         `${highlight(email_event_response.moderation?.commenter_notif, { languageSubset: ['md', 'html', 'txt'], ignoreIllegals: true })}`,
            //       )
            //   }
            //   if (util.print_w_quiet_and_filter_opts(options, 'notify=site')) {
            //     if (options.heading)
            //       console.log(
            //         `${chalk.whiteBright('=== Comment Received Notification ===')}\n`,
            //       )
            //     if (email_event_response.moderation?.moderator_notif)
            //       console.log(
            //         `${highlight(email_event_response.moderation?.moderator_notif, { languageSubset: ['md', 'html', 'txt'], ignoreIllegals: true })}`,
            //       )
            //   }
            // }
          } else {
            throw response.unwrapErr()
          }
        })
      },
    )
  return simulate_cmd
}
