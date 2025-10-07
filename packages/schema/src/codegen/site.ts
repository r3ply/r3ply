import { Parse } from '@exodus/schemasafe'
import {
  ConfigParser,
  make_config_parser,
  make_typed_parser,
  TypedParseResult,
} from '../util'
import {
  MinimalR3plySiteConfig as MinR3plySiteConfigLib,
  R3plySiteConfig as R3plySiteConfigLib,
} from '../config'

const site_raw_parser_module = '<RAW_SITE_PARSER_MODULE>'

/** PARSER */
export const raw_site_parser: Parse = site_raw_parser_module as any as Parse
export const site_parser: ConfigParser<R3plySiteConfig> = make_config_parser(
  make_typed_parser<R3plySiteConfig>(raw_site_parser),
)
export type R3plySiteConfig = R3plySiteConfigLib
export type MinimalR3plySiteConfig = MinR3plySiteConfigLib
export const R3plySiteConfig = mk_site_singleton(site_parser)
export function mk_site_singleton(site_parser: ConfigParser<R3plySiteConfig>) {
  type SiteConfigGenerator = (
    min_site_config: MinimalR3plySiteConfig,
  ) => TypedParseResult<R3plySiteConfig>
  function make_site_generator(
    site_parser: ConfigParser<R3plySiteConfig>,
  ): SiteConfigGenerator {
    return function (min_site_config: MinimalR3plySiteConfig) {
      return site_parser(min_site_config, 'json')
    }
  }
  return Object.assign(make_site_generator(site_parser), {
    parse: site_parser,
  })
}
