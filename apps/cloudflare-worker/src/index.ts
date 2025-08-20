import { Hono } from 'hono'
import api from './api'
import { Result } from 'oxide.ts'
import {
  R3plySiteConfig,
  siteConfigParser,
  systemConfigParser,
} from '@r3ply/config'
import TOML from '@iarna/toml'
import {
  Moderation,
  R3plyGithubBot,
  resolve_config_references,
} from '@r3ply/lib'
import { createHMAC } from './util'
// @ts-ignore
import r3ply_system_config_toml from '../r3ply.config.toml'
import {
  CloudflareR3ply,
  resolve_config_references_at_domain,
} from './cloudflare-r3ply'
import { GistClient } from './state/gist'
import { CommentState } from './state/d1'

// initialization for fetch handler
const app = new Hono()
app.route('/', api)

// initialization for email handler
const r3ply_system_config = systemConfigParser(
  JSON.stringify(TOML.parse(r3ply_system_config_toml)),
).value!
const r3ply = CloudflareR3ply(r3ply_system_config)

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
    return comment_via_email(msg, {
      db: undefined,
      gist_token: env.R3PLY_GIST_TOKEN,
      hmac_secret: env.HMAC_SECRET,
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
 * Site owners store their r3ply config at (/.well-known)?/r3ply.config.{toml,json}. This function gets it.
 *
 * @param domain the domain that the config pertains to
 * @returns a Result type of the file as a string, or an error if there is none
 */
async function get_site_config(domain: string) {
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
    if (response.ok && url.pathname.endsWith('.toml')) {
      return response.text().then((text) => {
        const site_config = siteConfigParser(
          JSON.stringify(TOML.parse(text)),
        ).value!
        return resolve_config_references(
          site_config,
          url.toString(),
          resolve_config_references_at_domain,
        )
      })
    }
    if (response.ok && url.pathname.endsWith('.json')) {
      return response.text().then((text) => {
        const site_config = siteConfigParser(text).value!
        return resolve_config_references(
          site_config,
          url.toString(),
          resolve_config_references_at_domain,
        )
      })
    }
  }
  throw new Error(`No config found, checked: \`${JSON.stringify(urls)}\``)
}

export async function comment_via_email(
  msg: ForwardableEmailMessage,
  deps: {
    db?: D1Database
    gist_token: string
    hmac_secret: string
    gh_pw: string
  },
) {
  const [site_domain, r3ply_domain] = Result.safe(() =>
    msg.to.match(/^(.+?)@(.+?)$/)!.slice(1, 3),
  ).expect('Error parsing site domain/r3ply domain from `to` portion of email')

  let site_config = get_site_config(site_domain)
  const email_bytes = new Response(msg.raw).bytes()

  const cf_r3ply_w_dependencies = r3ply(
    GistClient(deps.gist_token),
    deps.db ? CommentState(deps.db) : undefined,
  )
  const process_email_into_comment = Promise.all([
    site_config,
    email_bytes,
  ]).then(([site_config, email_bytes]) => {
    let moderation = (type: 'github' | 'webhook'): Moderation => {
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
      createHMAC(deps.hmac_secret),
      moderation,
    )
    return handle_comment_via_email([site_config, email_bytes])
  })
  let result = await Result.safe(process_email_into_comment)
  if (result.isErr()) {
    console.error(
      `Error processing email into comment, underlying reason:\n\n${result.unwrapErr()}`,
    )
  } else {
    console.log(
      `Comment!\n\n\`\`\`\n${JSON.stringify(result.unwrap(), null, 2)}\n\`\`\``,
    )
  }
  return result
}
