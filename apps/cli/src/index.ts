#!/usr/bin/env node
import { program } from 'commander'
import { comment_cmd, config_cmd, init_cmd } from './cmd.js'
import chalk from 'chalk'

program
  .name('re')
  .version('0.0.1')
  .description('CLI for r3ply')
  .option('--config <path>', 'specify path to config')

program.addCommand(init_cmd(process.cwd()))
program.addCommand(config_cmd(process.cwd()))
program.addCommand(comment_cmd(process.cwd()))
program.parseAsync(process.argv).catch((error: Error) => {
  console.error(chalk.redBright(error.message))
  process.exit(1)
})
