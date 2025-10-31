import { Command } from 'commander'
import { project, generate, moderation } from './lib'
import { util } from './util'
import { Result } from 'oxide.ts'
import {
  R3plySignetConfig,
  R3plySiteConfig,
  R3plySystemConfig,
} from '@r3ply/schema/config'
import {
  R3ply,
  SignetIssuer,
  moderation as mod_todo,
  util as r3ply_util,
} from '@r3ply/lib'
import prompts, { PromptObject } from 'prompts'
import dayjs from 'dayjs'
import { mailbox } from 'typescript-mailbox-parser'
import { tty } from './tty'
import {
  GitHubModerationRequest,
  GitHubModerationTicket,
  LocalModerationRequest,
  LocalModerationTicket,
} from 'packages/lib/src/moderation'
import { BaseCmdOptions } from '.'

// init ------------------------------------------------------------------------
export type InitCmdOptions = {
  date: string
  force: boolean
  rotateKeys: boolean
}
export function init_cmd(cwd: string) {
  const init_cmd = new Command('init')
    .description('initialize a new r3ply project (at current directory)')
    .option(
      '--date <YYYY-MM-DD>',
      'set date of CLI issued signet',
      dayjs().format('YYYY-MM-DD'),
    )
    .option('--force', 'overwrite an existing r3ply project', false)
    .option(
      '--rotate-keys',
      'regenerate anonymization and encryption keys',
      false,
    )
    // TODO: maybe one day add this: .option('--keep-settings', 'preserve settings even after rewriting', false)
    .action(async (options: InitCmdOptions) => {
      if (options.force) tty.cmds.init.print_warn_force_is_set()
      return project
        .init_r3ply_project_at(cwd, options)
        .then(async (result) => {
          const system_config = util.unsafeUnwrap(
            await project.get_cli_system_config(cwd),
          )
          const { r3ply_dir, signet_key } = util.unsafeUnwrap(result)
          const signet = await SignetIssuer(signet_key, system_config)(
            project.DEFAULT_SITE_DOMAIN,
            project.DEFAULT_R3PLY_DOMAIN,
            {
              issued_date: options.date,
              label: project.DEFAULT_CLI_SIGNET_LABEL,
            },
          )
          const signet_config = {
            site: [signet],
          }
          tty.cmds.init.print_initialized_new_project(
            r3ply_dir,
            signet_config,
            init_cmd.parent!.opts<BaseCmdOptions>().format,
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
        config_cmd.parent?.opts<BaseCmdOptions>().config,
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

export type GenerateSignetCmdOpts = {
  site: string
  r3ply: string
  date: string
  interactive: boolean
  label: string
}

export type GenerateConfigCmdOpts = {
  site: string
  r3ply: string
  date: string
  label: string
  moderation: string
  full: boolean
}

export type GenerateEmailCmdOpts = {
  from?: string
  to?: string
  date?: string
  subject?: string
  subjectPath?: string
  body?: string
  messageId?: string
}

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

        function parse_email_addr(str: string) {
          const mb = mailbox(str)
          if (Array.isArray(mb))
            throw new Error(
              `Invalid email '${str}', errors ${JSON.stringify(mb)}`,
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
          .map(
            ([k, v]) => `?${encodeURIComponent(k)}=${encodeURIComponent(v!)}`,
          )
          .join('&')

        // output result
        tty.cmds.generate.print_mail_to_link(query)
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
      '--site <domain>',
      `domain the signet is issued to`,
      project.DEFAULT_SITE_DOMAIN,
    )
    .option(
      '--r3ply <r3ply domain>',
      `domain of issuing r3ply server`,
      project.DEFAULT_R3PLY_DOMAIN,
    )
    .option(
      '--date <YYYY-MM-DD>',
      'date signet was issued',
      dayjs().format('YYYY-MM-DD'),
    )
    .option(
      '--label <string>',
      'name for this signet, e.g. "production", "test"',
      project.DEFAULT_CLI_SIGNET_LABEL,
    )
    .action(async (options: GenerateSignetCmdOpts) => {
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

      // TODO - add back in the interactive version once I've figured out an elegant UX for generating the config
      if (options.interactive) {
        const answers = await prompts(
          signet_questions(options.site, options.r3ply, options.date),
        )
        options.site = answers.site
        options.r3ply = answers.r3ply
        options.date = answers.date
      }
      const format = generate_cmd.parent!.opts<BaseCmdOptions>().format
      tty.cmds.generate.print_signet(signet, format)
    })

  const config_cmd = generate_cmd
    .command('config')
    .description('generate a config')
    .option(
      '--site <domain>',
      `site domain the signet is issued to`,
      project.DEFAULT_SITE_DOMAIN,
    )
    .option(
      '--r3ply <r3ply domain>',
      `domain of issuing r3ply server`,
      project.DEFAULT_R3PLY_DOMAIN,
    )
    .option(
      '--date <YYYY-MM-DD>',
      'date signet was issued',
      dayjs().format('YYYY-MM-DD'),
    )
    .option(
      '--label <string>',
      'name for this signet, e.g. "production", "test"',
      project.DEFAULT_CLI_SIGNET_LABEL,
    )
    .option(
      '--moderation <github | webhook | local>',
      'moderation method',
      'local',
    )
    .option('--full', 'Generate config with defaults set for all values', false)
    .action(async (options: GenerateConfigCmdOpts) => {
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
        comments: options.full ? { email: {} } : undefined,
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
                throw new Error(
                  `Unknown moderation type: ${options.moderation}`,
                )
              }
            })(),
          ],
        },
      })
      const format = generate_cmd.parent!.opts<BaseCmdOptions>().format
      tty.cmds.generate.print_config(parsed.value!, format)
      return
    })

  const email_cmd = generate_cmd
    .command('email')
    .description('generate a comment as an email, based on your config')
    .argument('[input]', 'Input text (can also accept pipe)')
    // Add email header options
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <url>', 'override email subject')
    .option('--subject-path <path>', 'override just path of subject')
    .option('--body <text>', 'override email body')
    .action(async (input: string | undefined, options: GenerateEmailCmdOpts) => {
      let site_config: R3plySiteConfig = await project.resolve_config(
        cwd,
        generate_cmd.parent?.opts<BaseCmdOptions>().config,
      )
      const site = site_config.site[util.random_int(site_config.site.length)]

      // If no argument, check for piped input
      if (!input && !process.stdin.isTTY) {
        console.log("reading from STDIN");
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
    })

  return generate_cmd
}

// simulate --------------------------------------------------------------------

export type SimulateCmdEmailOpts = {
  moderate: boolean
  dryRun: boolean
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
}

export function simulate_cmd(cwd: string) {
  const simulate_cmd = new Command('simulate').description(
    'simulate receiving a comment using your r3ply config',
  )

  simulate_cmd
    .command('email')
    .argument('[input]', 'Input text (can also accept pipe)')
    .option('--moderate', 'send comment for moderation (local-only)', false)
    .option('--dry-run', 'print output but have no side effects', false)
    .option('--message-id <id>', 'override Message-ID header')
    .option('--date <date>', 'override Date header')
    .option('--from <address>', 'override From header')
    .option('--to <address>', 'override To header')
    .option('--subject <url | path>', 'override email subject')
    .option('--body <text>', 'override email body')
    .option('--no-heading', 'hide headings for each stage of simulation', true)
    .option(
      '-q, --quiet [stage...]',
      `silence output at \`stages\` or all output if stages is blank. stages are: [email,config,prescreen,receive,deliverable,prepare,comment,moderation,notify]. Stages can be further narrowed by adding an \`=\` after the stage name: [config=site,config=system,moderation=local]. If a stage is acted upon as an array, then you can append an underscore to silce a specific element, e.g. moderation=local_0`,
      util.split_list,
    )
    .option(
      '-f, --filter [stage...]',
      `filter output at \`stages\` or all output if stages is blank. stages are: [email,config,prescreen,receive,deliverable,prepare,comment,moderation,notify]. Stages can be further narrowed by adding an \`=\` after the stage name: [config=site,config=system,moderation=local]. If a stage is acted upon as an array, then you can append an underscore to filter a specific element, e.g. moderation=local_0`,
      util.split_list,
    )
    .action(async (input: string | undefined, options: SimulateCmdEmailOpts, cmd) => {
      // TOML or JSON
      const format = simulate_cmd.parent!.opts<BaseCmdOptions>().format

      // Get site config
      let site_config_path: string = await project.resolve_config_path(
        cwd,
        simulate_cmd.parent?.opts<BaseCmdOptions>().config,
      )
      let site_config_result = await Result.safe(
        project.resolve_config(
          cwd,
          simulate_cmd.parent?.opts<BaseCmdOptions>().config,
        ),
      )
      let site_config: R3plySiteConfig = site_config_result.expect(
        'Error while opening config (hint: run `re config validate` to debug)',
      )
      site_config = await r3ply_util.config.resolve_references(
        site_config,
        site_config_path,
        project.dereference_local_file,
      )

      // Get system config
      const cli_system_config: R3plySystemConfig = util.unsafeUnwrap(
        await project.get_cli_system_config(cwd),
      )

      // Issue signet
      const signet: R3plySignetConfig = ((to: string | undefined) => {
        let site_domain: string = (() => {
          if (to) {
            const mb = mailbox(to)
            if (Array.isArray(mb))
              throw new Error(
                `Unable to parse --to '${to}', reasons: ${JSON.stringify(mb)}`,
              )
            else {
              return mb.local
            }
          } else {
            return project.DEFAULT_SITE_DOMAIN
          }
        })()
        const site = site_config.site.find((k) => k.domain == site_domain)
        if (site) {
          return site
        } else {
          return site_config.site[util.random_int(site_config.site.length)]
        }
      })(options.to)

      // Generate email
      if (!input && !process.stdin.isTTY) input = await util.read_stdin()
      const email = await generate
        .email(signet.domain, signet.r3ply, { body: input, ...options })
        .then((email) => {
          tty.cmds.simulate.print_comment_via_email_initial(email, options)
          return email
        })

      // Get keys (for anonymizing/encrypting From header)
      const keys = await project.get_keys(cwd)

      // Make r3ply instance
      const r3ply = R3ply(cli_system_config)

      // Make comment via email handler
      const file_writer: mod_todo.WriteLocalFile = (
        args: mod_todo.LocalModerationArgs,
      ) => moderation.write_comment_locally(cwd, args, options.dryRun)
      const local_moderation_channel = mod_todo.LocalModeration(file_writer)
      const github_moderation_channel = mod_todo.GitHubModeration(
        moderation.mock_github_api_fetcher(),
      )
      const handle_email_comment = r3ply.comments.viaEmail(
        keys.signet_key,
        keys.encrypt_email_key,
        {},
        [local_moderation_channel, github_moderation_channel],
      )

      // Pass generated email to email comment handler
      const email_comment_result = await Result.safe(
        handle_email_comment([site_config, new TextEncoder().encode(email)]),
      )

      // Check for any unchecked errors
      if (email_comment_result.isErr()) {
        throw email_comment_result.unwrapErr()
      }

      // Print progress of email -> comment pipeline
      const email_event_response = email_comment_result.unwrap()
      tty.cmds.simulate.print_comment_via_email_response(
        cli_system_config,
        { site_config_path, site_config },
        email_event_response,
        options,
        format,
      )

      // Print moderation
      if (options.moderate && email_event_response.moderation) {
        const supported_mod_channels = ['local', 'github']
        for (const moderation_channel_type of supported_mod_channels) {
          for (const [
            index,
            { type, request },
          ] of email_event_response.moderation
            .filter((m) => m.type == moderation_channel_type)
            .entries()) {
            switch (type) {
              case 'local': {
                const print = tty.cmds.simulate.print_local_moderation_event
                if (request.isOk()) {
                  const ticket = (await request
                    .unwrap()
                    .send()) as LocalModerationTicket
                  print(
                    request as Result<LocalModerationRequest, Error>,
                    ticket,
                    index,
                    options,
                    format,
                  )
                } else {
                  print(
                    request as Result<LocalModerationRequest, Error>,
                    undefined,
                    index,
                    options,
                    format,
                  )
                }
                break
              }
              case 'github': {
                const print = tty.cmds.simulate.print_github_moderation_event
                if (request.isOk()) {
                  const ticket = (await request
                    .unwrap()
                    .send()) as GitHubModerationTicket
                  print(
                    request as Result<GitHubModerationRequest, Error>,
                    ticket,
                    index,
                    options,
                    format,
                  )
                } else {
                  print(
                    request as Result<GitHubModerationRequest, Error>,
                    undefined,
                    index,
                    options,
                    format,
                  )
                }
                break
              }
              default:
                break
            }
          }
        }

        if (site_config.moderation) {
          const ignored_moderation_results = Object.keys(
            site_config.moderation,
          ).filter(
            (moderation_key) =>
              !supported_mod_channels.includes(moderation_key),
          )
          const other_moderation_results =
            email_event_response.moderation.filter(
              (r) => !supported_mod_channels.includes(r.type),
            )
          tty.cmds.simulate.print_ignored_moderation_channels(
            ignored_moderation_results,
            other_moderation_results,
            options,
            format,
          )
        }
      }
    })
  return simulate_cmd
}
