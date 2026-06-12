import { Hono } from 'hono'
import { CommentCache } from './state/d1'
import { SignetIssuer } from '@r3ply/lib'
import { R3plySystemConfig } from '@r3ply/schema/config'

function api(r3ply: R3plySystemConfig) {
  const api = new Hono<{ Bindings: Env }>()
  api.use(async (c, next) => {
    const { success } = await c.env.API_RATE_LIMITER_UNAUTHENTICATED.limit({
      key: c.req.header('CF-Connecting-IP') ?? 'NO_IP',
    })
    if (success) {
      return next()
    } else {
      return new Response('Rate limit exceeded', { status: 429 })
    }
  })
  api.get('/signet/:domain/:issued?', async (c) => {
    const req_url = new URL(c.req.url)
    c.res.headers.set('Access-Control-Allow-Origin', '*')
    if (!r3ply.domains.includes(req_url.hostname)) {
      throw new Error(
        'This r3ply service is not configured to serve at this domain',
      )
    }
    const { domain, issued } = c.req.param()
    const new_site_url = new URL(`https://${domain}`)
    const signet_issuer = SignetIssuer(c.env.SIGNET_KEY, r3ply)
    const result = signet_issuer(new_site_url.hostname, req_url.hostname, {
      issued_date: issued,
    })
    return result.then((result) => {
      const format = c.req.query('format')
      if (format && format.toLowerCase() == 'json') {
        return c.json({ ...result, domain, r3ply: req_url.hostname })
      } else {
        return c.text(`[[site]]
domain = "${domain}"
r3ply = "${req_url.hostname}"
signet = "${result.signet}"
issued = ${result.issued}\n`)
      }
    })
  })

  api.get('/cache/comments/pending/:domain/:path{.+}', async (c) => {
    const { domain, path } = c.req.param()
    c.res.headers.set('Access-Control-Allow-Origin', '*')
    c.res.headers.set('Content-Type', 'application/json')
    return CommentCache(c.env.R3PLY_STAGING_DB)
      .get(domain, path)
      .then((rows) => rows.map((row) => JSON.parse(row.comment_json)))
      .then((comments) => c.json(comments))
  })

  api.get('/cache/comments/pending/:domain/', async (c) => {
    const { domain } = c.req.param()
    c.res.headers.set('Access-Control-Allow-Origin', '*')
    c.res.headers.set('Content-Type', 'application/json')
    return CommentCache(c.env.R3PLY_STAGING_DB)
      .all(domain)
      .then((rows) => rows.map((row) => JSON.parse(row.comment_json)))
      .then((comments) => c.json(comments))
  })

  return api
}

export default api
