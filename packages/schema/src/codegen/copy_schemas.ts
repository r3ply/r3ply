import { extra, signet, site, r3ply } from '../config'
import { comments, email } from '../config/comments'
import { moderation, github, local, webhook } from '../config/moderation'
import path from 'path'
import fs from 'fs'

console.log('Copying schemas to dist...\n')

const cwd = process.cwd()
const dist_dir = 'dist'

/**
 * all schemas have to be added here to be copied over
 */
const schemas = [
  site,
  r3ply,
  extra,
  signet,
  comments,
  email,
  moderation,
  github,
  webhook,
  local,
]

for (const s of schemas as { $id: string }[]) {
  const url = new URL(s.$id)
  const joined = path.join(cwd, dist_dir, url.pathname)
  fs.mkdirSync(path.dirname(joined), { recursive: true })
  fs.writeFileSync(joined, JSON.stringify(s, null, 2))
  console.log(`  - Wrote ${joined}`)
}

console.log('\nFinished writing schemas!')
