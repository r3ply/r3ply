import { Hono } from 'hono'
import api from './api'
import { Option, Result, Some } from 'oxide.ts'
import r3ply_system_config_toml from '../r3ply.config.toml'
import { GistClient, GistFiles } from './state/gist'
import { CommentCache, CommentState } from './state/d1'
import { R3plySystemConfig, R3plySiteConfig } from '@r3ply/schema/config'
import { util, R3ply, moderation, comments } from '@r3ply/lib'
import { mailbox } from 'typescript-mailbox-parser'
import { create_reply_email, DereferenceFileAtURL } from './util'
import {
  mk_cf_accept,
  mk_cf_deliverable,
  mk_cf_prepare,
  mk_cf_process,
  mk_cf_receive,
} from './cloudflare-r3ply'
import { EmailMessage } from 'cloudflare:email'

// initialization for email handler
const r3ply_system_config = R3plySystemConfig.parse(
  r3ply_system_config_toml,
).value!
const r3ply = R3ply(r3ply_system_config)

// initialization for fetch handler
const app = new Hono()
app.route('/', api(r3ply_system_config))

let promised_email_bytes: Promise<Uint8Array<ArrayBufferLike>>

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx)
  },
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const cache = CommentCache(env.R3PLY_STAGING_DB)
    await cache.evict(259200) // i.e. 72h in seconds. TODO: configurable by r3ply system config later
  },
  async email(...params): Promise<void> {
    const [msg, env] = params

    // parse mailbox of email's 'To' header
    const to_mb = mailbox(msg.to)
    if (!to_mb.ok) {
      console.error(
        `Error parsing 'To' mailbox '${msg.to}'\n${JSON.stringify(to_mb, null, 2)}`,
      )
      return Promise.resolve()
    }
    console.log(`mb local: ${to_mb.local}`)

    switch (to_mb.local) {
      case 'ping': {
        const { success } = await env.EMAIL_INTERFACE_RATE_LIMITER.limit({
          key: msg.from,
        })
        if (!success) {
          msg.setReject('Rate limit exceeded.')
          return Promise.resolve()
        }
        const date_sent = new Date(
          Option(msg.headers.get('Date')).expect('Date header is required.'),
        )
        const now = new Date()
        const cache = CommentCache(env.R3PLY_STAGING_DB)
        await cache.set(
          'example.com',
          '/ping/',
          'ID: ' + Date.now().toString(),
          JSON.stringify({}),
        )
        await msg.reply(
          create_reply_email(msg, {
            subject: 'Re: ping',
            body: `time=${now.valueOf() - date_sent.valueOf()}ms`,
          }),
        )
        return Promise.resolve()
      }
      default: {
        console.log(`default: ${to_mb.local}`)

        // Guard against emails that are too big
        if (msg.rawSize > r3ply_system_config.email.max_size_bytes) {
          console.error(
            `Email received was ${msg.rawSize} bytes, which exceeds the limit of ${r3ply_system_config.email.max_size_bytes} bytes`,
          )
          msg.setReject('Email exceeds allowed size.')
          return Promise.resolve()
        } else {
          promised_email_bytes = new Response(msg.raw)
            .arrayBuffer()
            .then((buffer) => new Uint8Array(buffer))
        }
        const email_comment_result = await Result.safe(
          comment_via_email(...params) as Promise<void>,
        )
        if (email_comment_result.isErr()) {
          console.error(
            `Error while handling comment via email\n "${email_comment_result.unwrapErr()}"`,
          )
          const backup = await Result.safe(
            backup_email(...params) as Promise<void>,
          )
          if (backup.isErr()) {
            return log_email(...params)
          } else {
            return Promise.resolve()
          }
        }
      }
    }
    return Promise.resolve()
  },
} satisfies ExportedHandler<Env>
/**
 * @description email handler to log comments received via email
 * @param params standard Cloudflare email params (i.e. request, env, ctx)
 * @returns Promise<void>
 */
const log_email: EmailExportedHandler<Env> = async () => {
  const email_bytes = await promised_email_bytes
  console.error(
    `An error occurred! Logging email as a final fail safe!\n${new TextDecoder('utf-8').decode(email_bytes)}`,
  )
}
/**
 * @description email handler to backup comments received via email
 * @param params standard Cloudflare email params (i.e. request, env, ctx)
 * @returns Promise<void>
 */
const backup_email: EmailExportedHandler<Env> = async (...params) => {
  const [, env] = params
  const gist_client = GistClient(env.R3PLY_GIST_TOKEN)
  const email_bytes = await promised_email_bytes
  const backup: GistFiles = {
    [crypto.randomUUID() + '.eml']: {
      content: new TextDecoder('utf-8').decode(email_bytes),
    },
  }
  const gist_result = gist_client.create_gist(
    backup,
    `An error occurred and a backup of this email comment was created to salvage the data.`,
  )
  return gist_result.then((gist) => {
    if (gist.isOk()) {
      console.error(
        `Email was backed up to ${JSON.stringify(gist.unwrap(), null, 2)}`,
      )
      return Promise.resolve()
    } else {
      console.error(
        `There was a problem trying to backup the email\n"${gist.unwrapErr()}"`,
      )
      return log_email(...params)
    }
  })
}
/**
 * @description email handler to handle comments received via email
 * @param params standard Cloudflare email params (i.e. request, env, ctx)
 * @returns Promise<void>
 */
const comment_via_email: EmailExportedHandler<Env> = async (...params) => {
  const [msg, env] = params
  const { success } = await env.COMMENT_VIA_EMAIL_RATE_LIMITER.limit({
    key: msg.from,
  })
  if (!success) {
    msg.setReject('Rate limit exceeded.')
    return Promise.resolve()
  }
  const message_id = Option(msg.headers.get('Message-ID')).expect(
    'Message-ID is required',
  )
  const comment_statefulness = CommentState(env.R3PLY_STAGING_DB)
  const moderation_channel_implementations: comments.email.CommentViaEmailSupportedModerationChannels[] =
    [moderation.GitHubModeration(github_api_fetcher(env.GITHUB_APP_PW))]
  const email_handler = r3ply.comments.viaEmail(
    env.SIGNET_KEY,
    env.EMAIL_ENCRYPT_KEY,
    {
      receive: mk_cf_receive('email', Some(comment_statefulness)),
      accept: mk_cf_accept(message_id, Some(comment_statefulness)),
      deliverable: mk_cf_deliverable(Some(comment_statefulness)),
      prepare: mk_cf_prepare(Some(comment_statefulness)),
      process: mk_cf_process(Some(comment_statefulness)),
    },
    moderation_channel_implementations,
  )
  const to_mb = mailbox(msg.to)
  if (Array.isArray(to_mb))
    throw new Error(
      `Email from '${msg.from}' could not be parsed as a mailbox. Error: ${JSON.stringify(to_mb, null, 2)}`,
    )
  const site_domain = to_mb.local
  const site_config = get_site_config(site_domain)
  const email_bytes = promised_email_bytes
  const comment_via_email_result = await Result.safe(
    Promise.all([site_config, email_bytes]).then(email_handler),
  )
  if (comment_via_email_result.isOk()) {
    if ((await site_config).comments?.cache) {
      const comment_ctx_result = comment_via_email_result.unwrap().prepared
      if (comment_ctx_result && comment_ctx_result.isOk()) {
        const comment_ctx = comment_ctx_result.unwrap()
        const cache_result = await comment_statefulness.cache.set(
          comment_ctx.r3ply.site,
          comment_ctx.comment.subject.path,
          comment_ctx.comment.id,
          comment_ctx,
        )
        if (cache_result.error) {
          console.error(
            `Error caching comment via email!\n\n${JSON.stringify(cache_result.error, null, 2)}`,
          )
        }
      }
    }
    comment_via_email_result.unwrap().prepared?.unwrap().comment.subject.path
    const moderation = comment_via_email_result.unwrap().moderation
    if (moderation) {
      for (const { type, request } of moderation) {
        if (request.isOk()) {
          await request.unwrap().send()
        }
      }
    }
  } else {
    throw comment_via_email_result.unwrapErr()
  }
  msg.reply(
    new EmailMessage(
      msg.to,
      msg.from,
      'Your comment was successfully submitted for moderation.',
    ),
  )
  return Promise.resolve()
}
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
        const site_config = R3plySiteConfig.parse(text)
        if (site_config.valid) {
          return site_config.value!
        }
      })
      if (site_config) {
        return util.config.resolve_references(
          site_config,
          url.href,
          DereferenceFileAtURL,
        )
      }
    }
  }
  throw new Error(`No config found, checked: \`${JSON.stringify(urls)}\``)
}
