#!/usr/bin/env node
import { program } from 'commander'
import { config_cmd, generate_cmd, init_cmd, simulate_cmd } from './cmd.js'
import chalk from 'chalk'

const allowed_formats = ['toml', 'json'] as const
type AllowedFormats = (typeof allowed_formats)[number]
export type BaseCmdOptions = {
  config?: string
  format: AllowedFormats
}

function validate_format(value: string) {
  if (!allowed_formats.includes(value.toLowerCase() as any)) {
    throw new Error(`Format must be one of: ${allowed_formats.join(' | ')}.`)
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

program.addCommand(init_cmd(process.cwd()))
program.addCommand(config_cmd(process.cwd()))
program.addCommand(generate_cmd(process.cwd()))
program.addCommand(simulate_cmd(process.cwd()))
program.parseAsync(process.argv).catch((error: Error) => {
  console.error(chalk.redBright(error.message))
  process.exit(1)
})
