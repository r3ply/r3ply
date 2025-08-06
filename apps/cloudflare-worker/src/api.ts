import { Hono } from 'hono'
import { CommentCache } from './state/d1'

const api = new Hono<{ Bindings: Env }>()

// /**
//  * Only used for local testing
//  */
// api.post('/comments/pending/clear', (c) => {
//   const cache = CommentCache(c.env.R3PLY_DB)
//   return cache.clear().then(_ => c.text('cleared'))
// })

// /**
//  * Only used for local testing
//  */
// api.post('/comments/pending/set/:comment_id/:domain/:path{.+}', (c) => {
//   const { comment_id, domain, path } = c.req.param()
//   const cache = CommentCache(c.env.R3PLY_DB)
//   return cache.set(domain, path, comment_id, {}).then(_ => c.text('set'))
// })

api.get('/comments/pending/get/:domain/:path{.+}', async (c) => {
  const { domain, path } = c.req.param()
  return CommentCache(c.env.R3PLY_DB)
    .get(domain, path)
    .then((comments) => c.json(comments))
})

export default api
