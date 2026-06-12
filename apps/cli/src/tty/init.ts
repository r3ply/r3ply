import chalk from 'chalk'
import { BaseCmdOptions } from '..'
import tty from '../tty'
import { R3plySignetConfig } from '@r3ply/schema/config'
import path from 'path'
import { highlight } from 'cli-highlight'
import TOML from '@iarna/toml'

export function print_warn_force_is_set() {
  console.debug(
    `--force=true ${tty.txt.warn('overwrites any preexisting .r3ply dir!\n')}`,
  )
}
export function print_initialized_new_project(
  r3ply_dir: string,
  signet_config: { site: R3plySignetConfig[] },
  format: BaseCmdOptions['format'],
) {
  console.info(
    `Initialized empty r3ply project at ${chalk.greenBright(path.dirname(r3ply_dir))}`,
    `\n\n${tty.txt.help('Add the following site entry to your config:')}`,
    `\n\n${highlight(format == 'toml' ? TOML.stringify(signet_config as any) : JSON.stringify(signet_config, null, 2))}`,
    `\n${tty.txt.help('Help:')} You can generate a config with ${tty.txt.help('`re generate config`')} if you have not already.`,
  )
}
