import { Command, HelpContext, program } from 'commander'
import { project } from '../lib'
import { BaseCmdOptions } from '..'
import { util } from '../util'
import { generate } from '.'
import chalk from 'chalk'

function config_cmd(cwd: string) {
  const config_cmd = new Command('config').description('r3ply config commands')
  config_cmd
    .command('validate')
    .description('validate your r3ply configuration')
    .action(async () => {
      const parent_opts = config_cmd.parent!.opts<BaseCmdOptions>()
      return config_validate(cwd, { ...parent_opts })
    })

  config_cmd
    .command('set-default <path>')
    .description('the default config path r3ply will use')
    .action(async (path) => {
      return util.unsafeUnwrap(await project.set_default_cli_config_path(cwd, path))
    })

  const generate_alias = config_cmd
    .command('generate')
    .addHelpText(
      'before',
      chalk.yellowBright('(alias for generate config, see usage below)\n'),
    )
    .description('Alias for generate config')
    .action(async () => {
      program.parseAsync(['generate', 'config'], { from: 'user' })
    })

  generate_alias.helpInformation = (ctx: HelpContext) => {
    const foo = generate(cwd)
      .commands.find((c) => c.name() == 'config')
      ?.helpInformation(ctx)
    return foo || 'See `re generate config` for more'
  }

  return config_cmd
}

async function config_validate(cwd: string, options: BaseCmdOptions) {
  const site_config_path = await project.resolve_config_path(
    cwd,
    options.config,
  )
  const site_config = util.unsafeUnwrap(
    await project.parse_site_config(cwd, site_config_path),
  )
  if (!site_config.valid)
    throw new util.CLIError(
      `config failed validation:\n\n${JSON.stringify(site_config.errors, null, 2)}`,
    )
}

export default config_cmd
