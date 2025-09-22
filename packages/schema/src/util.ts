import { ParseResult, Parse, Schema } from '@exodus/schemasafe'
import TOML from '@iarna/toml'

export type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}

export interface TypedParse<T> {
  (value: string): TypedParseResult<T>
  toModule(): string
  toJSON(): Schema
}

export function make_typed_parser<T>(parse: Parse): TypedParse<T> {
  const fn = Object.assign(
    ((value: string) => {
      const result = parse(value)
      return result as TypedParseResult<T>
    }) as TypedParse<T>,
    {
      toModule: parse.toModule,
      toJSON: parse.toJSON,
    },
  )
  return fn
}

/**
 * A type alias of T but where all the fields are optional
 */
export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

function deep_merge<T>(base: T, override?: DeepPartial<T>): T {
  if (override === undefined) return base

  if (Array.isArray(base)) {
    // For arrays, fully replace if override is provided
    return override as T
  } else if (base && typeof base === 'object') {
    const result: any = { ...base } // shallow copy
    for (const key in override) {
      if (override[key] !== undefined) {
        result[key] = deep_merge((base as any)[key], override[key])
      }
    }
    return result
  } else {
    // primitive value or function → override if present
    return override as T
  }
}

/**
 * Recursively combine two objects. Arrays are overwritten not combined.
 * @param base
 * @param override
 * @returns
 */
export function merge_with_defaults<T1, T2 extends T1>(
  defaults: T1,
  overrides?: DeepPartial<T2>,
): T1 {
  return deep_merge(defaults, overrides)
}

export function add_type_to_parser<T>(parser: Parse): TypedParse<T> {
  function add_type(input: string): TypedParseResult<T> {
    let parse_result = parser(input)
    return parse_result as TypedParseResult<T>
  }
  add_type['toJSON'] = parser.toJSON
  add_type['toModule'] = parser.toModule
  return add_type
}
export type ConfigParser<T> = (
  input: string | any,
  type?: 'json' | 'toml',
) => TypedParseResult<T>
export function make_config_parser<T>(parser: TypedParse<T>): ConfigParser<T> {
  return (input: string | any, type?: 'json' | 'toml'): TypedParseResult<T> => {
    // first normalize input to a string
    let content_to_parse: string
    if (typeof input === 'string') {
      content_to_parse = input
    } else if (typeof input === 'object' && input !== null) {
      content_to_parse = JSON.stringify(input)
    } else {
      throw new Error('Invalid input type')
    }

    // then use the normalized input (shadow variable to remove it from scope)
    return ((input: string) => {
      // if type is JSON, parse as JSON no matter what
      if (type == 'json') {
        return parser(content_to_parse)
      }
      // if type is TOML, parse as TOML no matter what (and add errors to output)
      else if (type == 'toml') {
        try {
          const toml_as_json = TOML.parse(input)
          return parser(JSON.stringify(toml_as_json))
        } catch (error: any) {
          const parse_w_original_input = parser(input)
          parse_w_original_input.error = error.toString()
          parse_w_original_input.errors = parse_w_original_input.errors
            ? [...parse_w_original_input.errors, error.toString()]
            : [error.toString()]
          parse_w_original_input.valid = false
          return parse_w_original_input
        }
      }

      // no 'type' has been provided, so try first JSON, then TOML
      const try_to_parse_json = parser(input)
      if (try_to_parse_json.valid || try_to_parse_json.errors)
        return try_to_parse_json
      else {
        try {
          // if parsing fails try again as TOML
          const toml_as_json = TOML.parse(input)
          const try_to_parse_toml = parser(JSON.stringify(toml_as_json))
          if (try_to_parse_toml.valid || try_to_parse_toml.errors)
            return try_to_parse_toml
          else return try_to_parse_json
        } catch (error: any) {
          // wasn't valid TOML, and neither the JSON nor TOML have important parsing errors, to the issue is probably related to the TOML somehow and therefore attach that error here
          try_to_parse_json.error = error.toString()
          try_to_parse_json.valid = false
          return try_to_parse_json
        }
      }
    })(content_to_parse)
  }
}

/**
 * This was a way I came up with and didn't end up using, but I didn't want to throw it away either.
 * It's a way of doing something like changing the optionality of properties in a schema if they have defaults
 * This already exists in `json-schema-to-ts`, but marking that property as required overrides the behavior.
 * Unfortunately, I didn't realize that parsers will not supply defaults if a property is marked as required.
 * But I think the approach was interesting and a kind of metaprogramming on schema that could be useful one day.
 *
 * @example
 *   type UserDefaultsMarked = FromSchema<
 *   typeof user_schema,
 *     {
 *       deserialize: [
 *         {
 *           pattern: {
 *             default: {},
 *           },
 *           output: { required: false }
 *         },
 *       ]
 *     }
 *   >
 *  type OptionalizedUser = ApplyOptionals<FromSchema<typeof user_schema>, UserDefaultsMarked>
 *  // Or you can apply them deeply (i.e. nested)
 *  type DeepOptionalizedUser = ApplyOptionalsDeep<FromSchema<typeof user_schema>, UserDefaultsMarked>
 */
type ApplyOptionals<
  Base extends Record<string, any>,
  Markers extends Record<keyof Base, any>,
> = {
  [K in keyof Base as Markers[K] extends { required: false }
    ? K
    : never]?: Base[K]
} & {
  [K in keyof Base as Markers[K] extends { required: false }
    ? never
    : K]: Base[K]
}

/**
 * @see ApplyOptionals
 */
type ApplyOptionalsDeep<Base, Markers> =
  // Case 1: marker says this is optional
  Markers extends { required: false }
    ? Base | undefined
    : // Case 2: objects
      Base extends Record<string, any>
      ? Markers extends Record<string, any>
        ? {
            [K in keyof Base as K extends keyof Markers
              ? Markers[K] extends { required: false }
                ? K
                : never
              : never]?: ApplyOptionalsDeep<
              Base[K],
              K extends keyof Markers ? Markers[K] : never
            >
          } & {
            [K in keyof Base as K extends keyof Markers
              ? Markers[K] extends { required: false }
                ? never
                : K
              : K]: ApplyOptionalsDeep<
              Base[K],
              K extends keyof Markers ? Markers[K] : never
            >
          }
        : Base
      : // Case 3: arrays
        Base extends Array<infer U>
        ? Markers extends Array<infer M>
          ? ApplyOptionalsDeep<U, M>[]
          : Base
        : Base
