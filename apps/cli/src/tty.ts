import {
  R3plySystemConfig,
  R3plySiteConfig,
  R3plySignetConfig,
} from '@r3ply/schema'
import { SimulateCmdEmailOpts } from './cmd'
import { comments } from '@r3ply/lib'
import { util } from './util'
import { highlight } from 'cli-highlight'
import chalk from 'chalk'
import TOML from '@iarna/toml'
import path from 'path'
import {
  ModerationRequest,
  ModerationTicket,
} from 'packages/lib/src/moderation'
import { Result } from 'oxide.ts'

export namespace tty {
  export namespace cmds {
    export namespace init {
      export function print_warn_force_is_set() {
        console.debug(
          `--force=true ${chalk.redBright('overwrites any preexisting .r3ply dir!\n')}`,
        )
      }
      export function print_initialized_new_project(
        r3ply_dir: string,
        signet_config: { site: R3plySignetConfig[] },
        format: 'toml' | 'json' = 'toml',
      ) {
        console.info(
          `Initialized empty r3ply project at ${chalk.greenBright(path.dirname(r3ply_dir))}`,
          `\n\n${chalk.yellowBright('Add the following site entry to your config:')}`,
          `\n\n${highlight(format == 'toml' ? TOML.stringify(signet_config as any) : JSON.stringify(signet_config, null, 2))}`,
        )
      }
    }
    export namespace generate {
      export function print_mail_to_link(query: string) {
        if (query == '') {
          console.debug(
            chalk.yellowBright(
              `# hint: use options, e.g. '--to', otherwise mailto link will be mostly empty.`,
            ),
          )
        }
        console.log(chalk.blueBright(`mailto:${query}`))
      }
      export function print_signet(signet: R3plySignetConfig) {
        console.log(
          highlight(
            TOML.stringify({
              site: [{ ...(signet as any) }],
            }),
          ),
        )
      }
      export function print_config(site_config: R3plySiteConfig) {
        console.log(highlight(TOML.stringify(site_config as any)))
      }
      export function print_email(email: string) {
        console.log(highlight(email, { language: 'yaml' }))
      }
    }
    export namespace simulate {
      export function print_comment_via_email_initial(
        email: string,
        options: SimulateCmdEmailOpts,
      ) {
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
      }
      export function print_comment_via_email_response(
        cli_system_config: R3plySystemConfig,
        {
          site_config_path,
          site_config,
        }: { site_config_path: string; site_config: R3plySiteConfig },
        email_event_response: comments.email.CommentEmailEventResponse,
        options: SimulateCmdEmailOpts,
      ) {
        if (util.print_w_quiet_and_filter_opts(options, 'config')) {
          if (util.print_w_quiet_and_filter_opts(options, 'config=system')) {
            if (options.heading)
              console.log(
                `${chalk.whiteBright('=== Comment: System Config ===\n')}`,
              )
            console.log(
              highlight(
                `# Generated using site config \n${TOML.stringify(cli_system_config)}`,
                { language: 'toml', ignoreIllegals: true },
              ) + '\n',
            )
          }
          if (util.print_w_quiet_and_filter_opts(options, 'config=site')) {
            if (options.heading)
              console.log(
                `${chalk.whiteBright('=== Comment: Site Config ===\n')}`,
              )
            console.log(
              `${highlight(
                `# From path ${site_config_path} \n${TOML.stringify(site_config as any)}`,
                { language: 'toml', ignoreIllegals: true },
              )}`,
            )
          }
        }

        // Prescreen
        const prescreen_details = email_event_response.prescreening
        if (prescreen_details) {
          if (util.print_w_quiet_and_filter_opts(options, 'prescreen')) {
            if (options.heading)
              console.log(
                chalk.whiteBright('=== Comment: Prescreening Results ===') +
                  '\n',
              )
            if (prescreen_details.isOk()) {
              console.log(
                highlight(TOML.stringify(prescreen_details.unwrap() as any), {
                  language: 'toml',
                  ignoreIllegals: true,
                }),
              )
            } else {
              chalk.redBright(prescreen_details.unwrapErr() + '\n')
            }
          }
        }

        // Receive
        const receive_details = email_event_response.received
        if (receive_details) {
          if (util.print_w_quiet_and_filter_opts(options, 'receive')) {
            if (options.heading) {
              console.log(
                chalk.whiteBright('=== Comment: Comment Received ===') + '\n',
              )
              if (receive_details.isOk()) {
                console.log(
                  highlight(TOML.stringify(receive_details.unwrap() as any), {
                    language: 'toml',
                    ignoreIllegals: true,
                  }),
                )
              } else {
                console.log(chalk.redBright(receive_details.unwrapErr() + '\n'))
              }
            }
          }
        }

        // Deliverable
        const deliverable_details = email_event_response.deliverable
        if (deliverable_details) {
          if (util.print_w_quiet_and_filter_opts(options, 'deliverable')) {
            if (options.heading)
              console.log(
                `${chalk.whiteBright('=== Comment: Deliverability Details ===')}\n`,
              )
            if (deliverable_details.isOk()) {
              console.log(
                `${highlight('# Note: `From` is redacted\n' + TOML.stringify(deliverable_details.unwrap() as any), { language: 'toml', ignoreIllegals: true })}`,
              )
            } else {
              console.log(
                `${chalk.redBright(deliverable_details.unwrapErr())}\n`,
              )
            }
          }
        }

        // Prepare
        const prepare_details = email_event_response.prepared
        if (prepare_details) {
          if (util.print_w_quiet_and_filter_opts(options, 'prepare')) {
            if (options.heading)
              console.log(
                `${chalk.whiteBright('=== Comment: Template Context ===')}\n`,
              )
            if (prepare_details.isOk()) {
              console.log(
                `${highlight('# These are the values available to your templates\n' + TOML.stringify(prepare_details.unwrap() as any), { language: 'toml', ignoreIllegals: true })}`,
              )
            } else {
              console.log(chalk.redBright(prepare_details.unwrapErr() + '\n'))
            }
          }
        }

        // Process
        const process_details = email_event_response.comment
        if (process_details) {
          if (util.print_w_quiet_and_filter_opts(options, 'comment')) {
            if (options.heading)
              console.log(
                `${chalk.whiteBright('=== Comment: Processed ===')}\n`,
              )
            if (process_details.isOk()) {
              console.log(highlight(process_details.unwrap()))
            } else {
              console.log(chalk.redBright(process_details.unwrapErr() + '\n'))
            }
          }
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
      }
      export function print_local_moderation_event(
        local_moderation_result: Result<
          {
            request: ModerationRequest<any, any, any, any>
            ticket: ModerationTicket<any, any, any>
          },
          Error
        >,
        count: number,
        options: SimulateCmdEmailOpts,
      ) {
        if (util.print_w_quiet_and_filter_opts(options, 'moderation')) {
          if (
            util.print_w_quiet_and_filter_opts(
              options,
              `moderation=local_${count}`,
            )
          ) {
            if (options.heading)
              console.log(
                chalk.whiteBright(`=== Moderation: Local[${count}] ===\n`),
              )
            if (local_moderation_result.isOk()) {
              const local_moderation_event = local_moderation_result.unwrap()
              const partial_request: Partial<
                typeof local_moderation_event.request
              > = local_moderation_event.request
              delete partial_request['send']
              partial_request.args.comment =
                '[elided... see "Comment: Processed" above]'
              const result_string = TOML.stringify({
                request: local_moderation_event.request,
              } as any)
                .replace(
                  '[request]',
                  '# `bypass` asks to skip moderation altogether. For local moderation it has no effect.\n[request]',
                )
                .replace(
                  /^(\s*)\[request\.args\]/m,
                  (_, spaces) =>
                    `${spaces}# \`relative_path\` is relative to project root.${spaces}[request.args]`,
                )
              console.log(highlight(result_string))
              if (local_moderation_event.ticket.details.isOk()) {
                const ticket_details =
                  local_moderation_event.ticket.details.unwrap()
                const ticket_string = TOML.stringify({
                  ticket: ticket_details,
                }).replace(
                  '[ticket.local]',
                  '# `ticket.local` is the response to a request for local moderation.\n[ticket.local]',
                )
                console.log(highlight(ticket_string))
              } else {
                const error = local_moderation_event.ticket.details.unwrapErr()
                console.log(chalk.redBright(`Error: ${error.message}`))
              }
            } else {
              const error = local_moderation_result.unwrapErr()
              console.log(
                chalk.redBright(`Moderation skipped: ${error.message}`),
              )
            }
            // Print blank line
            console.log()
          }
        }
      }
      export function print_ignored_moderation_channels(
        ignored_moderation_types: string[],
        not_implemented_moderation_results: NonNullable<
          comments.email.CommentEmailEventResponse['moderation']
        >,
        options: SimulateCmdEmailOpts,
      ) {
        if (util.print_w_quiet_and_filter_opts(options, 'moderation')) {
          if (util.print_w_quiet_and_filter_opts(options, `moderation=other`)) {
            if (options.heading)
              console.log(chalk.whiteBright(`=== Moderation: Other ===\n`))
            const ignored_moderation = TOML.stringify({
              ignored: ignored_moderation_types,
            }).replace(
              'ignored',
              "# moderation channels in your config that were ignored by the CLI (they're unsupported)\nignored",
            )
            console.log(highlight(ignored_moderation))
            const not_implemented_mod = TOML.stringify({
              not_implemented: not_implemented_moderation_results as any,
            }).replace(
              'not_implemented',
              "# unexpected moderation results that haven't been fully implemented\nnot_implemented",
            )
            console.log(highlight(not_implemented_mod))
          }
        }
      }
    }
  }
}
