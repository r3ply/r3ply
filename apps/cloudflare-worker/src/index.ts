import { Hono } from 'hono'
import api from './api'
import { Result, Some } from 'oxide.ts'
// @ts-ignore
import r3ply_system_config_toml from '../r3ply.config.toml'
import { CloudflareR3ply } from './cloudflare-r3ply'
import { GistClient } from './state/gist'
import { CommentState } from './state/d1'
import { R3plySystemConfig, R3plySiteConfig } from '@r3ply/schema/config'
import { util, R3ply, moderation, comments } from '@r3ply/lib'
import { mailbox } from 'typescript-mailbox-parser'
import { DereferenceFileAtURL } from './util'
import { foo } from './foo'

// initialization for email handler
const r3ply_system_config = R3plySystemConfig.parse(
  r3ply_system_config_toml,
).value!
const r3ply = R3ply(r3ply_system_config)

// initialization for fetch handler
const app = new Hono()
app.route('/', api(r3ply_system_config))

export default {
  // E.g. curl -X POST --data-binary @003.eml  localhost:8787
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },

  async email(
    msg: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const email_handler = foo(r3ply, {
      anonymize_key: env.SIGNET_KEY,
      encrypt_key: env.EMAIL_ENCRYPT_KEY,
      github_pw: env.GITHUB_APP_PW,
      comment_state: Some(CommentState(env.R3PLY_STAGING_DB)),
      gist_client: Some(GistClient(env.R3PLY_GIST_TOKEN)),
    })
    const to_mb = mailbox(msg.to)
    if (Array.isArray(to_mb))
      throw new Error(
        `Email from '${msg.from}' could not be parsed as a mailbox. Error: ${JSON.stringify(to_mb, null, 2)}`,
      )
    const [site_domain, system_domain] = [to_mb.local, to_mb.domain]
    const site_config = get_site_config(site_domain)
    const email_bytes = new Response(msg.raw).bytes()
    const response = Promise.all([site_config, email_bytes]).then(email_handler)

    const result = await response
    console.log('RESULT')

    console.log(result)
    if (result.moderation) {
      for (const { type, request } of result.moderation) {
        console.log(`=== moderation type: ${type} ===`)
        if (request.isOk()) {
          // console.log(`Request was valid, now sending...`);
          // const ticket = await request.unwrap().send()
          // console.log(`Moderation ticket returned, unwrapping results...\n${JSON.stringify(ticket.details.unwrapUnchecked(), null, 2)}`);
        } else {
          console.log(
            `Request was not valid, reason: ${JSON.stringify(request.unwrapErr())}`,
          )
        }
      }
    }
    return Promise.resolve()

    return comment_via_email(msg, {
      db: env.R3PLY_STAGING_DB,
      gist_token: env.R3PLY_GIST_TOKEN,
      signet_key: env.SIGNET_KEY,
      encrypt_email_key: env.EMAIL_ENCRYPT_KEY,
      gh_pw: env.GITHUB_APP_PW,
    }).then((result) => {
      if (result.isOk()) {
        return Promise.resolve()
      } else {
        console.error(`Error! See details below:`)
        console.error(result.unwrapErr())
        return Promise.resolve()
      }
    })
  },
} satisfies ExportedHandler<Env>

/**
 * Partially applies password to GitHub bot dependency to perform API call
 *
 * @param github_pw the password to access the r3ply GitHub bot
 * @returns A dependency for performing API calls to the r3ply GitHub bot
 */
function github_api_fetcher(
  github_pw: string,
): moderation.PerformGitHubApiFetch {
  const result: moderation.PerformGitHubApiFetch = async (
    args: moderation.CreateCommentInRepoArgs,
  ) => {
    const request = new Request(
      // the origin of the URL is ignored if the fetch belongs to a bound service.
      'https://r3ply-github-app.spence.workers.dev/comments?strategy=GitHub:repo&open_pr=true',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${github_pw}`,
        },
        body: JSON.stringify(args),
      },
    )
    return fetch(request).then((response) => response.json())
  }
  return result
}

/**
 * Fetches the raw r3ply config according to the following order of precedence (high to low):
 *
 * https://${domain}/.well-known/r3ply/config.toml
 * https://${domain}/.well-known/r3ply/config.json
 * https://${domain}/.well-known/r3ply.config.toml
 * https://${domain}/.well-known/r3ply.config.json
 * https://${domain}/r3ply.config.toml
 * https://${domain}/r3ply.config.json
 * https://${domain}/r3ply.toml
 * https://${domain}/r3ply.json
 *
 * The config key's are also resolved.
 *
 * @param domain the domain that the config pertains to
 * @returns a Result type of the file as a string, or an error if there is none
 */
async function get_site_config(domain: string): Promise<R3plySiteConfig> {
  const urls = [
    new URL(`https://${domain}/.well-known/r3ply/config.toml`),
    new URL(`https://${domain}/.well-known/r3ply/config.json`),
    new URL(`https://${domain}/.well-known/r3ply.config.toml`),
    new URL(`https://${domain}/.well-known/r3ply.config.json`),
    new URL(`https://${domain}/r3ply.config.toml`),
    new URL(`https://${domain}/r3ply.config.json`),
    new URL(`https://${domain}/r3ply.toml`),
    new URL(`https://${domain}/r3ply.json`),
  ]
  for (const url of urls) {
    const response = await fetch(url, { method: 'GET' })
    if (response.ok) {
      const site_config = await response.text().then(async (text) => {
        console.log(`text found at ${url}`)
        const site_config = R3plySiteConfig.parse(text)
        if (site_config.valid) {
          console.log(`text from ${url} parsed as valid config`)
          return site_config.value!
        }
      })
      if (site_config) {
        return util.config.resolve_references(
          site_config,
          domain,
          DereferenceFileAtURL,
        )
      }
    }
  }
  throw new Error(`No config found, checked: \`${JSON.stringify(urls)}\``)
}

export async function comment_via_email(
  msg: ForwardableEmailMessage,
  deps: {
    db?: D1Database
    gist_token: string
    signet_key: string
    encrypt_email_key: string
    gh_pw: string
  },
) {
  const mb = mailbox(msg.from)
  if (Array.isArray(mb))
    throw new Error(
      `Email from ${msg.from} could not be parsed as a mailbox. Error: ${JSON.stringify(mb, null, 2)}`,
    )
  const [site_domain, r3ply_domain] = [mb.local, mb.domain]

  let site_config = get_site_config(site_domain)
  util.config.resolve_references(
    site_config,
    `https://${site_domain}`,
    DereferenceFileAtURL,
  )
  const email_bytes = new Response(msg.raw).bytes()

  const cf_r3ply_w_dependencies = r3ply(
    GistClient(deps.gist_token),
    deps.db ? CommentState(deps.db) : undefined,
  )
  const process_email_into_comment = Promise.all([
    site_config,
    email_bytes,
  ]).then(([site_config, email_bytes]) => {
    let moderation = (type: 'github' | 'webhook'): Moderation<any, any> => {
      switch (site_config.comments.email.moderation.type) {
        case 'github':
          return R3plyGithubBot(deps.gh_pw, fetch)
        case 'webhook':
          throw new Error('not implemented yet')
        default:
          throw new Error('not implemented yet')
      }
    }

    const handle_comment_via_email = cf_r3ply_w_dependencies.comments.viaEmail(
      deps.signet_key,
      deps.encrypt_email_key,
      moderation,
    )
    return handle_comment_via_email([site_config, email_bytes])
  })
  let result = await Result.safe(process_email_into_comment)
  if (result.isErr()) {
    console.error(
      `Error processing email into comment, underlying reason:\n\n${result.unwrapErr()}`,
    )
  }
  // For Debugging:
  // else {
  //   console.log(
  //     `Comment!\n\n\`\`\`\n${JSON.stringify(result.unwrap(), null, 2)}\n\`\`\``,
  //   )
  // }
  return result
}
