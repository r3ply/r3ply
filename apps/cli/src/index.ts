#!/usr/bin/env node
import { program } from 'commander'
import { comments_cmd, config_cmd, init_cmd } from './cmd.js'
import chalk from 'chalk'

program
  .name('re')
  .version('1.0.0')
  .description('CLI for r3ply, an email-based commenting service')
program.addCommand(init_cmd(process.cwd()))
program.addCommand(config_cmd(process.cwd()))
program.addCommand(comments_cmd(process.cwd()))
program.parseAsync(process.argv).catch((error: Error) => {
  console.error(chalk.redBright(error.message))
  process.exit(1)
})
