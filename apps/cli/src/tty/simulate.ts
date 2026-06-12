import { highlight } from 'cli-highlight'
import { SimulateCmdEmailOpts } from '../cmds/simulate'
import tty from '../tty'
import { util } from '../util'
import { R3plySystemConfig, R3plySiteConfig } from '@r3ply/schema/config'
import { comments, moderation } from '@r3ply/lib'
import { BaseCmdOptions } from '..'
import TOML from '@iarna/toml'
import { Result } from 'oxide.ts'

export function print_comment_via_email_initial(
  email: string,
  options: SimulateCmdEmailOpts,
) {
  if (util.print_w_quiet_and_filter_opts(options, 'email')) {
    // TODO: for some reason highlight.js doesn't support `eml`???
    if (options.heading) console.log(`${tty.txt.info('# === Input Email ===')}`)
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
  format: BaseCmdOptions['format'],
) {
  if (util.print_w_quiet_and_filter_opts(options, 'config')) {
    if (util.print_w_quiet_and_filter_opts(options, 'config=system')) {
      if (options.heading)
        console.log(`${tty.txt.info('# === Comment: System Config ===\n')}`)
      console.log(
        format == 'toml'
          ? highlight(
              `# Generated using site config \n${TOML.stringify(cli_system_config)}`,
              { language: 'toml', ignoreIllegals: true },
            ) + '\n'
          : highlight(
              `/* Generated using site config*/ \n${JSON.stringify(cli_system_config, null, 2)}`,
              { language: 'json', ignoreIllegals: true },
            ) + '\n',
      )
    }
    if (util.print_w_quiet_and_filter_opts(options, 'config=site')) {
      if (options.heading)
        console.log(`${tty.txt.info('# === Comment: Site Config ===\n')}`)
      console.log(
        format == 'toml'
          ? `${highlight(
              `# From path ${site_config_path} \n${TOML.stringify(site_config as any)}`,
              { language: 'toml', ignoreIllegals: true },
            )}`
          : `${highlight(
              `/* From path ${site_config_path} */ \n${JSON.stringify(site_config, null, 2)}`,
              { language: 'json', ignoreIllegals: true },
            )}` + '\n',
      )
    }
  }

  // Prescreen
  if (util.print_w_quiet_and_filter_opts(options, 'prescreen')) {
    if (options.heading)
      console.log(
        tty.txt.info('# === Comment: Prescreening Results ===') + '\n',
      )
    if (email_event_response.prescreening.isOk()) {
      // Delete results in order to redact information that was shown in prior stages
      const result: comments.email.PrescreenResult =
        email_event_response.prescreening.unwrap()
      delete result.comments_configured.general_comments
      delete result.comments_configured.email_comments
      console.log(
        format == 'toml'
          ? highlight(TOML.stringify(result as any), {
              language: 'toml',
              ignoreIllegals: true,
            })
          : highlight(JSON.stringify(result, null, 2), {
              language: 'json',
              ignoreIllegals: true,
            }) + '\n',
      )
    } else {
      console.log(tty.txt.warn('# Prescreening failed checks:\n'))
      const prescreen_failures = email_event_response.prescreening.unwrapErr()
      if (prescreen_failures.r3ply_is_disabled.result == 'fail') {
        console.log(
          format == 'toml'
            ? highlight(
                TOML.stringify({
                  r3ply_is_disabled:
                    prescreen_failures.r3ply_is_disabled.errors,
                }),
              )
            : highlight(
                JSON.stringify(
                  {
                    r3ply_is_disabled:
                      prescreen_failures.r3ply_is_disabled.errors,
                  },
                  null,
                  2,
                ) + '\n',
              ),
        )
      }
      if (prescreen_failures.comments_accepted.result == 'fail') {
        console.log(
          format == 'toml'
            ? highlight(
                TOML.stringify({
                  comments_accepted:
                    prescreen_failures.comments_accepted.errors,
                }),
              )
            : highlight(
                JSON.stringify(
                  {
                    comments_accepted:
                      prescreen_failures.comments_accepted.errors,
                  },
                  null,
                  2,
                ) + '\n',
              ),
        )
      }
      if (prescreen_failures.comments_configured.result == 'fail') {
        console.log(
          format == 'toml'
            ? highlight(
                TOML.stringify({
                  comments_configured:
                    prescreen_failures.comments_configured.errors,
                }),
              )
            : highlight(
                JSON.stringify(
                  {
                    comments_configured:
                      prescreen_failures.comments_configured.errors,
                  },
                  null,
                  2,
                ),
              ),
        )
      }
      if (prescreen_failures.email_size_bytes.result == 'fail') {
        console.log(
          format == 'toml'
            ? highlight(
                TOML.stringify({
                  email_size_bytes: prescreen_failures.email_size_bytes.errors,
                }),
              )
            : highlight(
                JSON.stringify(
                  {
                    email_size_bytes:
                      prescreen_failures.email_size_bytes.errors,
                  },
                  null,
                  2,
                ),
              ),
        )
      }
    }
  }

  // Receive
  const receive_details = email_event_response.received
  if (receive_details) {
    if (util.print_w_quiet_and_filter_opts(options, 'receive')) {
      if (options.heading) {
        console.log(tty.txt.info('# === Comment: Comment Received ===') + '\n')
        if (receive_details.isOk()) {
          console.log(
            format == 'toml'
              ? highlight(TOML.stringify(receive_details.unwrap() as any), {
                  language: 'toml',
                  ignoreIllegals: true,
                })
              : highlight(JSON.stringify(receive_details.unwrap() as any), {
                  language: 'json',
                  ignoreIllegals: true,
                }) + '\n',
          )
        } else {
          console.log(tty.txt.warn(receive_details.unwrapErr() + '\n'))
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
          `${tty.txt.info('# === Comment: Deliverability Details ===')}\n`,
        )
      if (deliverable_details.isOk()) {
        // Elide email to not repeat information
        const result: Partial<comments.email.DeliverableEmail> =
          deliverable_details.unwrap()
        delete result.email
        console.log(
          format == 'toml'
            ? `${highlight('# Note: `From` is redacted\n' + TOML.stringify(result as any), { language: 'toml', ignoreIllegals: true })}`
            : `${highlight('/* Note: `From` is redacted */\n' + JSON.stringify(result, null, 2), { language: 'json', ignoreIllegals: true })}\n`,
        )
      } else {
        console.log(`${tty.txt.warn(deliverable_details.unwrapErr())}\n`)
      }
    }
  }

  // Prepare
  const prepare_details = email_event_response.prepared
  if (prepare_details) {
    if (util.print_w_quiet_and_filter_opts(options, 'prepare')) {
      if (options.heading)
        console.log(`${tty.txt.info('# === Comment: Template Context ===\n')}`)
      if (prepare_details.isOk()) {
        console.log(
          format == 'toml'
            ? `${highlight('# These are the values available to your templates\n\n' + TOML.stringify(prepare_details.unwrap() as any), { language: 'toml', ignoreIllegals: true })}`
            : `${highlight('/* These are the values available to your templates */\n' + JSON.stringify(prepare_details.unwrap(), null, 2), { language: 'json', ignoreIllegals: true })}\n`,
        )
      } else {
        console.log(tty.txt.warn(prepare_details.unwrapErr() + '\n'))
      }
    }
  }

  // Process
  const process_details = email_event_response.comment
  if (process_details) {
    if (util.print_w_quiet_and_filter_opts(options, 'comment')) {
      if (options.heading)
        console.log(`${tty.txt.info('# === Comment: Processed ===')}\n`)
      if (process_details.isOk()) {
        console.log(highlight(process_details.unwrap()))
      } else {
        console.log(tty.txt.warn(process_details.unwrapErr() + '\n'))
      }
    }
  }
}
export function print_local_moderation_event(
  request: Result<moderation.LocalModerationRequest, Error>,
  ticket: moderation.LocalModerationTicket | undefined,
  count: number,
  options: SimulateCmdEmailOpts,
  format: BaseCmdOptions['format'],
) {
  if (util.print_w_quiet_and_filter_opts(options, 'moderation')) {
    if (
      util.print_w_quiet_and_filter_opts(options, `moderation=local_${count}`)
    ) {
      if (options.heading)
        console.log(tty.txt.info(`# === Moderation: Local[${count}] ===\n`))
      if (request.isOk()) {
        const partial_request: Partial<ReturnType<typeof request.unwrap>> =
          request.unwrap()
        delete partial_request['send']
        partial_request.args = request.unwrap().args
        partial_request.args.comment =
          '[elided... see above (or add `comment` to --filter`)]'
        const result_string =
          format == 'toml'
            ? TOML.stringify({
                request: partial_request,
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
            : JSON.stringify(
                {
                  request: partial_request,
                },
                null,
                2,
              )
                .replace(
                  /^(\s*)"bypass":/m,
                  (_, spaces) =>
                    `${spaces}/* \`bypass\` asks to skip moderation altogether. For local moderation it has no effect. */\n${spaces}"bypass":`,
                )
                .replace(
                  /^(\s*)"args":/m,
                  (_, spaces) =>
                    `${spaces}/* \`relative_path\` is relative to project root. */\n${spaces}"args":`,
                ) + '\n'
        const request_comment =
          format == 'toml'
            ? `#################################\n# Request portion of moderation #\n#################################\n`
            : `/*********************************\n * Request portion of moderation *\n *********************************/\n`
        console.log(
          highlight(request_comment + '\n' + result_string, {
            language: format,
          }),
        )
        if (ticket) {
          if (ticket.details.isOk()) {
            const ticket_details = ticket.details.unwrap()
            const ticket_string =
              format == 'toml'
                ? TOML.stringify({
                    ticket: ticket_details,
                  }).replace(
                    '[ticket.local]',
                    '# `ticket.local` is the response to a request for local moderation.\n[ticket.local]',
                  )
                : JSON.stringify(
                    {
                      ticket: ticket_details,
                    },
                    null,
                    2,
                  ).replace(
                    /^(\s*)"local":/m,
                    (_, spaces) =>
                      `${spaces}/* \`ticket.local\` is the response to a request for local moderation. */\n${spaces}"local":`,
                  )
            const ticket_comment =
              format == 'toml'
                ? `################################\n# Ticket portion of moderation #\n################################\n`
                : `/********************************\n * Ticket portion of moderation *\n ********************************/\n`
            console.log(
              highlight(ticket_comment + '\n' + ticket_string, {
                language: format,
              }),
            )
          } else {
            const error = ticket.details.unwrapErr()
            console.log(tty.txt.warn(`Error: ${error.message}`))
          }
        }
      } else {
        const error = request.unwrapErr()
        console.log(tty.txt.warn(`Moderation skipped: ${error.message}`))
      }
      // Print blank line
      console.log()
    }
  }
}
export function print_github_moderation_event(
  request: Result<moderation.GitHubModerationRequest, Error>,
  ticket: moderation.GitHubModerationTicket | undefined,
  count: number,
  options: SimulateCmdEmailOpts,
  format: BaseCmdOptions['format'],
) {
  if (util.print_w_quiet_and_filter_opts(options, 'moderation')) {
    if (
      util.print_w_quiet_and_filter_opts(options, `moderation=github_${count}`)
    ) {
      if (options.heading)
        console.log(
          tty.txt.info(`# === Moderation: GitHub[${count}] (MOCKED) ===\n`),
        )
      if (request.isOk()) {
        const partial_request: Partial<ReturnType<typeof request.unwrap>> =
          request.unwrap()
        delete partial_request['send']
        partial_request.args = request.unwrap().args
        partial_request.args.comment_data =
          '[elided... see above (or add `comment` to --filter`)]'
        const result_string =
          format == 'toml'
            ? TOML.stringify({
                request: partial_request,
              } as any)
                .replace(
                  '[request]',
                  '# `bypass` would request to skip moderation altogether.\n[request]',
                )
                .replace(
                  /^(\s*)\[request\.args\]/m,
                  (_, spaces) =>
                    `${spaces}# Arguments that would be sent to create a GitHub PR${spaces}[request.args]`,
                )
            : JSON.stringify(
                {
                  request: partial_request,
                },
                null,
                2,
              )
                .replace(
                  /^(\s*)"bypass":/m,
                  (_, spaces) =>
                    `${spaces}/* \`bypass\` would request to skip moderation altogether. */\n${spaces}"bypass":`,
                )
                .replace(
                  /^(\s*)"args":/m,
                  (_, spaces) =>
                    `${spaces}/* Arguments that would be sent to create a GitHub PR */\n${spaces}"args":`,
                ) + '\n'
        const request_comment =
          format == 'toml'
            ? `#################################\n# Request portion of moderation #\n#################################\n`
            : `/*********************************\n * Request portion of moderation *\n *********************************/\n`
        console.log(
          highlight(request_comment + '\n' + result_string, {
            language: format,
          }),
        )
        if (ticket) {
          if (ticket.details.isOk()) {
            const ticket_details = ticket.details.unwrap()
            const ticket_string =
              format == 'toml'
                ? TOML.stringify({
                    ticket: ticket_details as any,
                  }).replace(
                    '[ticket.github]',
                    '# `ticket.local` is the response to a request for local moderation.\n[ticket.local]',
                  )
                : JSON.stringify(
                    {
                      ticket: ticket_details as any,
                    },
                    null,
                    2,
                  )
                    .replace(
                      '[ticket.github]',
                      '# `ticket.local` is the response to a request for local moderation.\n[ticket.local]',
                    )
                    .replace(
                      /^(\s*)"github":/m,
                      (_, spaces) =>
                        `${spaces}/* \`ticket.local\` is the response to a request for local moderation. */\n${spaces}"github":`,
                    )
            const ticket_comment =
              format == 'toml'
                ? `################################\n# Ticket portion of moderation #\n################################\n`
                : `/********************************\n * Ticket portion of moderation *\n ********************************/\n`
            console.log(
              highlight(ticket_comment + '\n' + ticket_string, {
                language: format,
              }),
            )
          } else {
            const error = ticket.details.unwrapErr()
            console.log(tty.txt.warn(`Error: ${error.message}`))
          }
        }
      } else {
        const error = request.unwrapErr()
        console.log(tty.txt.warn(`Moderation skipped: ${error.message}`))
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
  format: BaseCmdOptions['format'],
) {
  if (util.print_w_quiet_and_filter_opts(options, 'moderation')) {
    if (util.print_w_quiet_and_filter_opts(options, `moderation=other`)) {
      if (options.heading)
        console.log(tty.txt.info(`# === Moderation: Other ===\n`))
      const ignored_moderation =
        format == 'toml'
          ? TOML.stringify({
              ignored: ignored_moderation_types,
            }).replace(
              'ignored',
              "# moderation channels in your config that were ignored by the CLI (they're unsupported)\nignored",
            )
          : JSON.stringify(
              {
                ignored: ignored_moderation_types,
              },
              null,
              2,
            ).replace(
              /^(\s*)"ignored":/m,
              (_, spaces) =>
                `${spaces}/* moderation channels in your config that were ignored by the CLI (they\'re unsupported) */\n${spaces}"ignored":`,
            ) + '\n'
      console.log(highlight(ignored_moderation))
      const not_implemented_mod =
        format == 'toml'
          ? TOML.stringify({
              not_implemented: not_implemented_moderation_results as any,
            })
          : JSON.stringify(
              {
                not_implemented: not_implemented_moderation_results as any,
              },
              null,
              2,
            )
      console.log(
        format == 'toml'
          ? highlight(
              "# unexpected moderation results that haven't been fully implemented\n" +
                not_implemented_mod,
            )
          : highlight(
              "/* unexpected moderation results that haven't been fully implemented */\n" +
                not_implemented_mod,
            ),
      )
    }
  }
}
