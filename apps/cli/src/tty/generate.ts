import chalk from 'chalk'
import tty from '../tty'
import { R3plySiteConfig, R3plySignetConfig } from '@r3ply/schema/config'
import { BaseCmdOptions } from '..'
import { highlight } from 'cli-highlight'
import TOML from '@iarna/toml'

export function print_mail_to_link(query: string) {
  if (query == '') {
    console.debug(
      tty.txt.help(
        `# hint: use options, e.g. '--to', otherwise mailto link will be mostly empty.`,
      ),
    )
  }
  console.log(chalk.blueBright(`mailto:${query}`))
}
export function print_signet(
  signet: R3plySignetConfig,
  format: BaseCmdOptions['format'],
) {
  console.log(
    highlight(
      format == 'toml'
        ? TOML.stringify({
            site: [{ ...(signet as any) }],
          })
        : JSON.stringify(
            {
              site: [{ ...(signet as any) }],
            },
            null,
            2,
          ),
    ),
  )
}
export function print_config(
  site_config: R3plySiteConfig,
  format: BaseCmdOptions['format'],
) {
  console.log(
    highlight(
      format == 'toml'
        ? TOML.stringify(site_config as any)
        : JSON.stringify(site_config, null, 2),
    ),
  )
}
export function print_email(email: string) {
  console.log(highlight(email, { language: 'yaml' }))
}
