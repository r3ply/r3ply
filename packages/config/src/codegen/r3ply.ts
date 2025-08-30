import { Parse } from '@exodus/schemasafe'
import {
  ConfigParser,
  DeepPartial,
  make_config_parser,
  make_typed_parser,
  merge_with_defaults,
  TypedParseResult,
} from '../util'
import { R3plySystemConfig as R3plySystemConfigLibrary } from '../schema/r3ply'

export const raw_parser_module = '<RAW_SYSTEM_PARSER_MODULE>'

/** PARSER */
const raw_site_parser: Parse = raw_parser_module as any as Parse
export const system_parser: ConfigParser<R3plySystemConfig> =
  make_config_parser(make_typed_parser<R3plySystemConfig>(raw_site_parser))
export type R3plySystemConfig = R3plySystemConfigLibrary
export const R3plySiteConfig = mk_r3ply_singleton(system_parser)
export function mk_r3ply_singleton(
  system_parser: ConfigParser<R3plySystemConfig>,
) {
  type SiteConfigGenerator = (
    required: {
      domains: string[]
      admin: {
        email: string
        name: string
      }[]
    },
    overrides?: DeepPartial<R3plySystemConfig>,
  ) => TypedParseResult<R3plySystemConfig>
  function make_r3ply_generator(
    system_parser: ConfigParser<R3plySystemConfig>,
  ): SiteConfigGenerator {
    return function (
      required: {
        domains: string[]
        admin: {
          email: string
          name: string
        }[]
      },
      overrides?: DeepPartial<R3plySystemConfig>,
    ) {
      const minimal_config: DeepPartial<R3plySystemConfig> = {
        admin: required.admin,
        domains: required.domains,
      }
      const defaults: R3plySystemConfig = system_parser(
        minimal_config,
        'json',
      ).value!
      const overriden = merge_with_defaults(defaults, overrides)
      return system_parser(overriden, 'json')
    }
  }
  return Object.assign(make_r3ply_generator(system_parser), {
    parse: system_parser,
  })
}
