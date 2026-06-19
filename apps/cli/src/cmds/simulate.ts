import { Command } from 'commander'
import { util } from '../util'
import { BaseCmdOptions } from '..'
import { project, generate as lib_generate, moderation } from '../lib'
import { Result } from 'oxide.ts'
import {
  R3plySiteConfig,
  R3plySystemConfig,
  R3plySignetConfig,
} from '@r3ply/schema/config'
import { R3ply, moderation as mod_todo, util as r3ply_util } from '@r3ply/lib'
import { mailbox } from 'typescript-mailbox-parser'
import tty from '../tty'

type SimulateCmdEmailOpts = {
  moderate: boolean
  dryRun: boolean
  from?: string
  to?: string
  date: string
  subject?: string
  subjectPath?: string
  body?: string
  messageId?: string
  quiet?: boolean | string[]
  filter?: boolean | string[]
  heading: boolean
}

function simulate_cmd(cwd: string) {
  const simulate_cmd = new Command('simulate').description(
    'simulate receiving a comment using your r3ply config',
  )

  simulate_cmd
    .command('email')
    .argument('[input]', 'Input text (can also accept pipe)')
    .option('--moderate', 'Moderate comment (local-only)', false)
    .option('--dry-run', 'Print output only', false)
    .option('--message-id <id>', 'Message-ID header')
    .option('--date <date>', 'Date header', 'now (UTC)')
    .option('--from <address>', 'From header')
    .option('--to <address>', 'To header')
    .option('--subject <url | path>', 'Email subject')
    .option('--body <text>', 'Email body')
    .option('--no-heading', 'Hide headings for each stage of simulation', true)
    .option(
      '-q, --quiet [stage...]',
      `silence output at \`stages\` (or all output if stages is blank).`,
      util.split_list,
    )
    .option(
      '-f, --filter [stage...]',
      `filter output at \`stages\` (or all output if stages is blank).`,
      util.split_list,
    )
    .addHelpText(
      'after',
      `\nFiltering/Silencing:
<stage> = <email | config | prescreen | receive | deliverable | prepare | comment | moderation | notify>
For substages add \`=\` after the stage name. Options are config=<site | system>, moderation=<github | webhook | local>
If a substage is an array you can append an underscore + index to specify which element, e.g. moderation=local_0`,
    )
    .addHelpText(
      'after',
      `\nExamples:
$ cat hello.txt | re simulate email --filter comment
$ re simulate email --subject /demo/ --silence prescreen,receive,deliverable
$ re simulate email --moderate --dry-run --body "testing" --filter comment,moderation=local_0`,
    )
    .action(
      async (input: string | undefined, options: SimulateCmdEmailOpts, cmd) => {
        const parent_opts = simulate_cmd.parent!.opts<BaseCmdOptions>()
        return simulate(cwd, input, { ...options, ...parent_opts })
      },
    )
  return simulate_cmd
}

async function simulate(
  cwd: string,
  input: string | undefined,
  options: SimulateCmdEmailOpts & BaseCmdOptions,
) {
  // Check if date is default
  if (options.date == 'now (UTC)') options.date = new Date().toUTCString()

  // Get site config
  let site_config_path: string = await project.resolve_config_path(
    cwd,
    options.config,
  )
  let site_config_result = await Result.safe(
    project.resolve_config(cwd, options.config),
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
        if (!mb.ok)
          throw new util.CLIError(
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
  const email = await lib_generate
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
    options.format,
  )

  // Update comment cache if enabled
  if (site_config.comments?.cache && email_event_response.prepared?.unwrap()) {
    const ctx = email_event_response.prepared?.unwrap()
    const domain = ctx.r3ply.site
    const path = ctx.comment.subject.path

    const comment_path = `comments/pending/${domain}${path}/index.html`
    const pending_comments: any[] = await project.get_comment_from_cache(cwd, {
      path: comment_path,
    })
    project.add_comment_to_cache(cwd, {
      path: comment_path,
      content: [...pending_comments, ctx],
    })
  }

  // Print moderation
  if (options.moderate && email_event_response.moderation) {
    const supported_mod_channels = ['local', 'github']
    for (const moderation_channel_type of supported_mod_channels) {
      for (const [index, { type, request }] of email_event_response.moderation
        .filter((m) => m.type == moderation_channel_type)
        .entries()) {
        switch (type) {
          case 'local': {
            const print = tty.cmds.simulate.print_local_moderation_event
            if (request.isOk()) {
              const ticket = (await request
                .unwrap()
                .send()) as mod_todo.LocalModerationTicket
              print(
                request as Result<mod_todo.LocalModerationRequest, Error>,
                ticket,
                index,
                options,
                options.format,
              )
            } else {
              print(
                request as Result<mod_todo.LocalModerationRequest, Error>,
                undefined,
                index,
                options,
                options.format,
              )
            }
            break
          }
          case 'github': {
            const print = tty.cmds.simulate.print_github_moderation_event
            if (request.isOk()) {
              const ticket = (await request
                .unwrap()
                .send()) as mod_todo.GitHubModerationTicket
              print(
                request as Result<mod_todo.GitHubModerationRequest, Error>,
                ticket,
                index,
                options,
                options.format,
              )
            } else {
              print(
                request as Result<mod_todo.GitHubModerationRequest, Error>,
                undefined,
                index,
                options,
                options.format,
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
        (moderation_key) => !supported_mod_channels.includes(moderation_key),
      )
      const other_moderation_results = email_event_response.moderation.filter(
        (r) => !supported_mod_channels.includes(r.type),
      )
      tty.cmds.simulate.print_ignored_moderation_channels(
        ignored_moderation_results,
        other_moderation_results,
        options,
        options.format,
      )
    }
  }
}

export { SimulateCmdEmailOpts }
export default simulate_cmd
