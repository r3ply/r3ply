import { Hono } from 'hono'
import { CommentCache } from './state/d1'

const api = new Hono<{ Bindings: Env }>()

api.get('/comments/pending/get/:domain/:path{.+}', async (c) => {
  const { domain, path } = c.req.param()
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  return CommentCache(c.env.R3PLY_STAGING_DB)
    .get(domain, path)
    .then((comments) => c.json(comments))
})

export default api
