import { Command } from 'commander'
import dayjs from 'dayjs'
import tty from '../tty'
import { project } from '../lib'
import { util } from '../util'
import { SignetIssuer } from '@r3ply/lib'
import { BaseCmdOptions } from '..'

type InitCmdOptions = {
  date: string
  force: boolean
  rotateKeys: boolean
}

function init_cmd(cwd: string) {
  const init_cmd = new Command('init')
    .description('initialize a new r3ply project (at current directory)')
    .option(
      '--date <YYYY-MM-DD>',
      'set date of CLI issued signet',
      dayjs().format('YYYY-MM-DD'),
    )
    .option('-f, --force', 'overwrite an existing r3ply project', false)
    .option(
      '--rotate-keys',
      'regenerate anonymization and encryption keys',
      false,
    )
    // TODO: maybe one day add this: .option('--keep-settings', 'preserve settings even after rewriting', false)
    .action(async (options: InitCmdOptions) => {
      if (options.force) tty.cmds.init.print_warn_force_is_set()
      return project
        .init_r3ply_project_at(cwd, options)
        .then(async (result) => {
          const system_config = util.unsafeUnwrap(
            await project.get_cli_system_config(cwd),
          )
          const { r3ply_dir, signet_key } = util.unsafeUnwrap(result)
          const signet = await SignetIssuer(signet_key, system_config)(
            project.DEFAULT_SITE_DOMAIN,
            project.DEFAULT_R3PLY_DOMAIN,
            {
              issued_date: options.date,
              label: project.DEFAULT_CLI_SIGNET_LABEL,
            },
          )
          const signet_config = {
            site: [signet],
          }
          tty.cmds.init.print_initialized_new_project(
            r3ply_dir,
            signet_config,
            init_cmd.parent!.opts<BaseCmdOptions>().format,
          )
        })
    })

  return init_cmd
}

export { InitCmdOptions }
export default init_cmd
