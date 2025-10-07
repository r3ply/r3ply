import { Parse } from '@exodus/schemasafe'
import {
  ConfigParser,
  make_config_parser,
  make_typed_parser,
  TypedParseResult,
} from '../util'
import {
  MinimalR3plySystemConfig,
  R3plySystemConfig as R3plySystemConfigLibrary,
} from '../config'

const r3ply_raw_parser_module = '<RAW_SYSTEM_PARSER_MODULE>'

/** PARSER */
export const raw_system_parser: Parse = r3ply_raw_parser_module as any as Parse
export const system_parser: ConfigParser<R3plySystemConfig> =
  make_config_parser(make_typed_parser<R3plySystemConfig>(raw_system_parser))
export type R3plySystemConfig = R3plySystemConfigLibrary
export const R3plySystemConfig = mk_r3ply_singleton(system_parser)
export function mk_r3ply_singleton(
  system_parser: ConfigParser<R3plySystemConfig>,
) {
  type SystemConfigGenerator = (
    minimal_sys_config: MinimalR3plySystemConfig,
  ) => TypedParseResult<R3plySystemConfig>
  function make_r3ply_generator(
    system_parser: ConfigParser<R3plySystemConfig>,
  ): SystemConfigGenerator {
    return function (minimal_sys_config: MinimalR3plySystemConfig) {
      return system_parser(minimal_sys_config, 'json')
    }
  }
  return Object.assign(make_r3ply_generator(system_parser), {
    parse: system_parser,
  })
}
