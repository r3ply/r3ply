#!/usr/bin/env node
import { program } from 'commander'
import { comments_cmd, config_cmd } from './cmd.js'
import chalk from 'chalk'

program.name('re').version('1.0.0').description('CLI for r3ply, an email-based commenting service FOO')
program.addCommand(config_cmd(process.cwd()))
program.addCommand(comments_cmd(process.cwd()))
program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.redBright(error.message))
  process.exit(1)
})
