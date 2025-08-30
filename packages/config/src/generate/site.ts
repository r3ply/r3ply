import { Parse } from '@exodus/schemasafe'
import {
  ConfigParser,
  DeepPartial,
  make_config_parser,
  make_typed_parser,
  merge_with_defaults,
  TypedParseResult,
} from '../util'
import { site } from '../schema/site.config.0.0.1'
import { FromSchema, FromSchemaDefaultOptions } from 'json-schema-to-ts'
import { R3plySignetConfig, signet } from '../schema/signet'
import { comments } from '../schema/comments'
import { moderation } from '../schema/moderation'
import { github } from '../schema/moderation/github'
import { webhook } from '../schema/moderation/webhook'
import { notify } from '../schema/notify'

export const raw_parser_module = '<RAW_SITE_PARSER_MODULE>'

/** PARSER */
const raw_site_parser: Parse = raw_parser_module as any as Parse
export const site_parser: ConfigParser<R3plySiteConfig> = make_config_parser(
  make_typed_parser<R3plySiteConfig>(raw_site_parser),
)
export type R3plySiteConfig = FromSchema<
  typeof site,
  FromSchemaDefaultOptions & {
    // prettier-ignore
    references: [typeof signet,typeof comments,typeof moderation,typeof github,typeof webhook,typeof notify,]
  }
>
export const R3plySiteConfig = mk_r3ply_singleton(site_parser)
export function mk_r3ply_singleton(site_parser: ConfigParser<R3plySiteConfig>) {
  type SiteConfigGenerator = (
    required: { site: R3plySignetConfig[] },
    overrides?: DeepPartial<R3plySiteConfig>,
  ) => TypedParseResult<R3plySiteConfig>
  function make_site_generator(
    site_parser: ConfigParser<R3plySiteConfig>,
  ): SiteConfigGenerator {
    return function (
      required: { site: R3plySignetConfig[] },
      overrides?: DeepPartial<R3plySiteConfig>,
    ) {
      const minimal_config = {
        site: required.site,
        comments: {
          email: {},
        },
        version: '0.0.1',
      }
      const defaults: R3plySiteConfig = site_parser(
        minimal_config,
        'json',
      ).value!
      const overriden = merge_with_defaults(defaults, overrides)
      return site_parser(overriden, 'json')
    }
  }
  return Object.assign(make_site_generator(site_parser), {
    parse: site_parser,
  })
}
