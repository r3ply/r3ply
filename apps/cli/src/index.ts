#!/usr/bin/env node
import { program } from 'commander'
import { config_cmd, generate_cmd, init_cmd, simulate_cmd } from './cmd.js'
import chalk from 'chalk'

program
  .name('re')
  .version('0.0.1')
  .description('CLI for r3ply')
  .option('--config <path>', 'specify path to config')

program.addCommand(init_cmd(process.cwd()))
program.addCommand(config_cmd(process.cwd()))
program.addCommand(generate_cmd(process.cwd()))
program.addCommand(simulate_cmd(process.cwd()))
program.parseAsync(process.argv).catch((error: Error) => {
  console.error(chalk.redBright(error.message))
  process.exit(1)
})
