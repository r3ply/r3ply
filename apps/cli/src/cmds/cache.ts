import { Command } from 'commander'
import { project } from '../lib'
import http from 'http'
import handler from 'serve-handler'
import tty from '../tty'
import { util } from '../util'

type CacheStartOpts = {
  port: number
  interface: string
  reset: boolean
}

function cache_cmd(cwd: string) {
  const cache_cmd = new Command('cache').description('manage comment cache')
  cache_cmd
    .command('serve')
    .description('serves cached comments')
    .option('--interface <INTERFACE>', 'Interface to bind on', '127.0.0.1')
    .option<number>(
      '--port <PORT>',
      'Which port to use',
      (str) => {
        const num = Number.parseInt(str)
        if (Number.isNaN(num))
          throw new util.CLIError(`Port must be a number, received ${str}`)
        return num
      },
      2274,
    )
    .option('--reset', 'Clears cache on startup', false)
    .action(async (options: CacheStartOpts, cmd) => {
      serve(cwd, options)
    })

  cache_cmd
    .command('clean')
    .description('deletes cache')
    .action(async () => {
      return project.clean_cache(cwd)
    })

  cache_cmd
    .command('evict')
    .description('evict stale pending comments')
    .option<number>(
      '--ttl <MAX_AGE_SECONDS>',
      'Max age allowed for comments in seconds',
      (str) => {
        const num = Number.parseInt(str)
        if (Number.isNaN(num))
          throw new util.CLIError(`ttl must be a number, received ${str}`)
        return num
      },
      259200,
    )
    .action(async (options: { ttl: number }) => {
      return project.evict_comments_from_cache(
        cwd,
        'comments/pending/',
        options.ttl,
      )
    })
  return cache_cmd
}

async function serve(cwd: string, options: CacheStartOpts) {
  const cache_dir = await project.get_cache_dir(cwd, options.reset)
  const static_dir = await project.find_static_dir(cwd)
  // It seemed like the easiest way to mimic the api cache was to save .html and just rewrite the header to .json
  const server = http.createServer((req, res) =>
    handler(req, res, {
      public: static_dir,
      cleanUrls: true,
      headers: [
        {
          source: '**',
          headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
        },
        {
          source: '/cache/comments/pending/**/index.html',
          headers: [
            { key: 'Content-Type', value: 'application/json' },
            {
              key: 'Cache-Control',
              value:
                'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
            {
              key: 'Expires',
              value: '0',
            },
          ],
        },
      ],
    }),
  )
  return new Promise<void>((resolve) => {
    server.listen(options.port, options.interface, () => {
      tty.cmds.cache.print_serving_cache(cache_dir, options)
      resolve()
    })
  })
}

export { CacheStartOpts }
export default cache_cmd
