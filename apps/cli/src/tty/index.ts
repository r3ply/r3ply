import * as init from './init'
import * as generate from './generate'
import * as simulate from './simulate'
import * as cache from './cache'
import chalk from 'chalk'

function txt_info(...text: unknown[]) {
  return chalk.whiteBright(text)
}
function txt_help(...text: unknown[]) {
  return chalk.yellowBright(text)
}
function txt_warn(...text: unknown[]) {
  return chalk.redBright(text)
}

export default {
  txt: {
    info: txt_info,
    help: txt_help,
    warn: txt_warn,
  },
  cmds: {
    init,
    generate,
    simulate,
    cache,
  },
}
