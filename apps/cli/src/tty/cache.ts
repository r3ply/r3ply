import { CacheStartOpts } from '../cmds/cache'

export function print_serving_cache(
  cache_dir: string,
  options: CacheStartOpts,
) {
  if (options.reset) console.log(`Resetting cache at ${cache_dir}`)
  console.log(
    `Static server running at http://${options.interface}:${options.port}`,
  )
  console.log(`Serving files from: ${cache_dir}`)
}
