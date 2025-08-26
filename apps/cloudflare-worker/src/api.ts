import { Hono } from 'hono'
import { CommentCache } from './state/d1'
import { Signet } from '@r3ply/lib'
import { R3plySystemConfig } from '@r3ply/config'

function api(r3ply: R3plySystemConfig) {
  const api = new Hono<{ Bindings: Env }>()

  api.get('/site/new/:domain', async (c) => {
    const req_url = new URL(c.req.url)
    if (!r3ply.domains.includes(req_url.hostname)) {
      throw new Error(
        'This r3ply service is not configured to serve at this domain',
      )
    }
    const { domain } = c.req.param()
    const new_site_url = new URL(`https://${domain}`)
    return Signet.issue(c.env.SIGNET_KEY)(
      new_site_url.hostname,
      req_url.hostname,
    ).then((result) => c.json({ ...result, domain, r3ply: req_url.hostname }))
  })

  api.get('/comments/pending/get/:domain/:path{.+}', async (c) => {
    const { domain, path } = c.req.param()
    c.res.headers.set('Access-Control-Allow-Origin', '*')
    return CommentCache(c.env.R3PLY_STAGING_DB)
      .get(domain, path)
      .then((comments) => c.json(comments))
  })

  return api
}

export default api
