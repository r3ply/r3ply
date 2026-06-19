#!/usr/bin/env node
import { program } from 'commander'
import { init, config, generate, simulate, cache } from './cmds'
import { util } from './util'
import tty from './tty'

const allowed_formats = ['toml', 'json'] as const
type AllowedFormats = (typeof allowed_formats)[number]
export type BaseCmdOptions = {
  config?: string
  format: AllowedFormats
}

function validate_format(value: string) {
  if (!allowed_formats.includes(value.toLowerCase() as any)) {
    throw new util.CLIError(`Format must be one of: ${allowed_formats.join(' | ')}.`)
  }
  return value.toLowerCase() as AllowedFormats
}

program
  .name('re')
  .version('0.0.1')
  .description('CLI for r3ply')
  .option('--config <path>', 'specify path to config')
  .option(
    '--format <toml | json>',
    'format to use with file output',
    validate_format,
    'toml',
  )

program.addCommand(init(process.cwd()))
program.addCommand(config(process.cwd()))
program.addCommand(generate(process.cwd()))
program.addCommand(simulate(process.cwd()))
program.addCommand(cache(process.cwd()))
program.parseAsync(process.argv).catch((error: Error) => {
  if (error instanceof util.CLIError) {
    program.error(tty.txt.warn(error.message))
  } else {
    program.error(error?.stack ?? String(error))
  }
})
