/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},

	async email(msg: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
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
} satisfies ExportedHandler<Env>;

export async function comment_via_email(
  msg: ForwardableEmailMessage,
  deps: { db?: D1Database; gist_token: string; hmac_secret: string; gh_pw: string },
) {
  const [site_domain, r3ply_domain] = Result.safe(() => msg.to.match(/^(.+?)@(.+?)$/)!.slice(1, 3)).expect(
    'Error parsing site domain/r3ply domain from `to` portion of email',
  )
  let site_config = get_site_config(site_domain)
  const email_bytes = new Response(msg.raw).bytes()
  const cf_r3ply_w_dependencies = r3ply(GistClient(deps.gist_token), deps.db ? CommentState(deps.db) : undefined)
  const process_email_into_comment = Promise.all([site_config, email_bytes]).then(([site_config_result, email_bytes]) => {
    const handle_comment_via_email = cf_r3ply_w_dependencies.comments.viaEmail(
      createHMAC(deps.hmac_secret),
      R3plyGithubBot(deps.gh_pw, fetch),
    )
    return handle_comment_via_email([site_config_result, email_bytes])
  })
  let result = await Result.safe(process_email_into_comment)
  if (result.isErr()) {
    console.error(`Error processing email into comment, underlying reason:\n\n${result.unwrapErr()}`)
  } else {
    console.log(`Comment!\n\n\`\`\`\n${result.unwrap()}\n\`\`\``)
  }
  return result
}

export async function merge_config(site_config: R3plySiteConfig, merge_reference: (config_value: string) => Promise<string>) {
  const promises: Promise<void>[] = []
  if (site_config.comments.email['comment_{}']) {
    promises.push(
      merge_reference(site_config.comments.email['comment_{}']).then((merged) => {
        site_config.comments.email['comment_{}'] = merged
      }),
    )
  }
  if (site_config.comments.email.moderation.type == 'github') {
    const moderation = site_config.comments.email.moderation
    const a = merge_reference(moderation['commit_msg_{}']).then((merged) => {
      moderation['commit_msg_{}'] = merged
    })
    const b = merge_reference(moderation['pr_body_{}']).then((merged) => {
      moderation['pr_body_{}'] = merged
    })
    const c = Promise.all([a, b]).then((_) => {
      site_config.comments.email.moderation = moderation
    })
    promises.push(a, b, c)
  }
  const d = merge_reference(site_config.comments.email.notify['comment_received_notif_{}']).then((merged) => {
    site_config.comments.email.notify['comment_received_notif_{}'] = merged
  })
  promises.push(d)
  return Promise.all(promises).then((_) => site_config)
}

export function merge_remote_reference(config_url: URL) {
  return async function (config_value: string) {
    const base_url = new URL('./', config_url)
    const response = fetch(new URL(config_value, base_url))
    return response.then((response) => {
      if (response.ok) {
        return response.text()
      } else {
        return config_value
      }
    })
  }
}
