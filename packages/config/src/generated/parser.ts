// @ts-nocheck
/** This file is generated. DO NOT EDIT. */
import { ParseResult } from '@exodus/schemasafe'
import { FromSchema } from 'json-schema-to-ts'

const schema = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'The r3ply Config Schema',
  description: 'JSON Schema for the r3ply config file',
  type: 'object',
  properties: {
    version: {
      type: 'string',
      enum: ['0.0.1'],
      description: 'The version of the config file.',
    },
    enabled: {
      type: 'boolean',
      description:
        'Comments will not be processed if set to false. Default is true.',
      default: true,
    },
    paused: { type: 'boolean' },
    email: {
      type: 'object',
      description: 'Configure comments received via email',
      additionalProperties: false,
      default: {
        enabled: true,
        subject: 'path',
        max_size_bytes: 1048576,
        attachments: false,
        block_list: [],
        allow_list: [],
        path: [],
      },
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description:
            'If false, comments via email are ignored. Default is true.',
        },
        subject: {
          type: 'string',
          enum: ['path'],
          default: 'path',
          description:
            'Changes how the subject line is used. Currently only `path` is allowed.',
        },
        max_size_bytes: { type: 'number', minimum: 0, default: 1048576 },
        attachments: {
          type: 'boolean',
          default: false,
          description: 'If false attachments are ignored. Default is false.',
        },
        block_list: {
          type: 'array',
          items: { type: 'string', pattern: '^[\\s\\S]*$' },
          default: [],
        },
        allow_list: {
          type: 'array',
          items: { type: 'string', pattern: '^[\\s\\S]*$' },
          default: [],
        },
        path: {
          type: 'array',
          description:
            "Array of path-specific email configuration overrides. Each item must include a 'routes' field to specify the applicable paths.",
          default: [],
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              routes: {
                type: 'array',
                items: {
                  type: 'string',
                  pattern: "^/?([a-zA-Z0-9._~!$&'()*+,;=:@%/-]*)(\\*)?$",
                  maxLength: 2048,
                },
                minItems: 1,
                uniqueItems: true,
                description:
                  'Routes for which this configuration applies. This field is required.',
              },
              enabled: { type: 'boolean' },
              max_size_bytes: { type: 'number', minimum: 0 },
              attachments: { type: 'boolean' },
              allow_list: {
                type: 'array',
                items: { type: 'string', pattern: '^[\\s\\S]*$' },
              },
              allow_extra: {
                type: 'array',
                items: { type: 'string', pattern: '^[\\s\\S]*$' },
                default: [],
              },
            },
            required: ['routes'],
          },
        },
      },
      required: [],
    },
  },
  required: ['version'],
  additionalProperties: false,
} as const

type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}

export type R3plySiteConfig = FromSchema<typeof schema>

// The generated raw parser function.
const raw_parser = (function () {
  'use strict'
  const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty)
  const stringLength = (string) =>
    /[\uD800-\uDFFF]/.test(string) ? [...string].length : string.length
  const pattern0 = new RegExp(
    "^\\/?([a-zA-Z0-9._~!$&'()*+,;=:@%/-]*)(\\*)?$",
    'u',
  )
  const unique = (array) => {
    if (array.length < 2) return true
    if (array.length === 2) return !deepEqual(array[0], array[1])
    const objects = []
    const primitives = array.length > 20 ? new Set() : null
    let primitivesCount = 0
    let pos = 0
    for (const item of array) {
      if (typeof item === 'object') {
        objects.push(item)
      } else if (primitives) {
        primitives.add(item)
        if (primitives.size !== ++primitivesCount) return false
      } else {
        if (array.indexOf(item, pos + 1) !== -1) return false
      }
      pos++
    }
    for (let i = 1; i < objects.length; i++)
      for (let j = 0; j < i; j++)
        if (deepEqual(objects[i], objects[j])) return false
    return true
  }
  const deepEqual = (obj, obj2) => {
    if (obj === obj2) return true
    if (!obj || !obj2 || typeof obj !== typeof obj2) return false
    if (obj !== obj2 && typeof obj !== 'object') return false

    const proto = Object.getPrototypeOf(obj)
    if (proto !== Object.getPrototypeOf(obj2)) return false

    if (proto === Array.prototype) {
      if (!Array.isArray(obj) || !Array.isArray(obj2)) return false
      if (obj.length !== obj2.length) return false
      return obj.every((x, i) => deepEqual(x, obj2[i]))
    } else if (proto === Object.prototype) {
      const [keys, keys2] = [Object.keys(obj), Object.keys(obj2)]
      if (keys.length !== keys2.length) return false
      const keyset2 = new Set([...keys, ...keys2])
      return (
        keyset2.size === keys.length &&
        keys.every((key) => deepEqual(obj[key], obj2[key]))
      )
    }
    return false
  }
  const pointerPart = (s) =>
    /~\//.test(s) ? `${s}`.replace(/~/g, '~0').replace(/\//g, '~1') : s
  const ref0 = function validate(data) {
    validate.errors = null
    let errorCount = 0
    if (!(typeof data === 'object' && data && !Array.isArray(data))) {
      if (validate.errors === null) validate.errors = []
      validate.errors.push({ keywordLocation: '#/type', instanceLocation: '#' })
      errorCount++
    } else {
      if (!(data.version !== undefined && hasOwn(data, 'version'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/version',
        })
        errorCount++
      }
      if (data.version !== undefined && hasOwn(data, 'version')) {
        if (!(typeof data.version === 'string')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/version/type',
            instanceLocation: '#/version',
          })
          errorCount++
        } else {
          if (!(data.version === '0.0.1')) {
            if (validate.errors === null) validate.errors = []
            validate.errors.push({
              keywordLocation: '#/properties/version/enum',
              instanceLocation: '#/version',
            })
            errorCount++
          }
        }
      }
      if (data.enabled !== undefined && hasOwn(data, 'enabled')) {
        if (!(typeof data.enabled === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/enabled/type',
            instanceLocation: '#/enabled',
          })
          errorCount++
        }
      } else data.enabled = true
      if (data.paused !== undefined && hasOwn(data, 'paused')) {
        if (!(typeof data.paused === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/paused/type',
            instanceLocation: '#/paused',
          })
          errorCount++
        }
      }
      if (data.email !== undefined && hasOwn(data, 'email')) {
        if (
          !(
            typeof data.email === 'object' &&
            data.email &&
            !Array.isArray(data.email)
          )
        ) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/email/type',
            instanceLocation: '#/email',
          })
          errorCount++
        } else {
          if (
            data.email.enabled !== undefined &&
            hasOwn(data.email, 'enabled')
          ) {
            if (!(typeof data.email.enabled === 'boolean')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/email/properties/enabled/type',
                instanceLocation: '#/email/enabled',
              })
              errorCount++
            }
          } else data.email.enabled = true
          if (
            data.email.subject !== undefined &&
            hasOwn(data.email, 'subject')
          ) {
            if (!(typeof data.email.subject === 'string')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/email/properties/subject/type',
                instanceLocation: '#/email/subject',
              })
              errorCount++
            } else {
              if (!(data.email.subject === 'path')) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/properties/email/properties/subject/enum',
                  instanceLocation: '#/email/subject',
                })
                errorCount++
              }
            }
          } else data.email.subject = 'path'
          if (
            data.email.max_size_bytes !== undefined &&
            hasOwn(data.email, 'max_size_bytes')
          ) {
            if (!(typeof data.email.max_size_bytes === 'number')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/max_size_bytes/type',
                instanceLocation: '#/email/max_size_bytes',
              })
              errorCount++
            } else {
              if (!(0 <= data.email.max_size_bytes)) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation:
                    '#/properties/email/properties/max_size_bytes/minimum',
                  instanceLocation: '#/email/max_size_bytes',
                })
                errorCount++
              }
            }
          } else data.email.max_size_bytes = 1048576
          if (
            data.email.attachments !== undefined &&
            hasOwn(data.email, 'attachments')
          ) {
            if (!(typeof data.email.attachments === 'boolean')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/attachments/type',
                instanceLocation: '#/email/attachments',
              })
              errorCount++
            }
          } else data.email.attachments = false
          if (
            data.email.block_list !== undefined &&
            hasOwn(data.email, 'block_list')
          ) {
            if (!Array.isArray(data.email.block_list)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/block_list/type',
                instanceLocation: '#/email/block_list',
              })
              errorCount++
            } else {
              for (let i = 0; i < data.email.block_list.length; i++) {
                if (
                  data.email.block_list[i] !== undefined &&
                  hasOwn(data.email.block_list, i)
                ) {
                  if (!(typeof data.email.block_list[i] === 'string')) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/email/properties/block_list/items/type',
                      instanceLocation: '#/email/block_list/' + i,
                    })
                    errorCount++
                  }
                }
              }
            }
          } else data.email.block_list = []
          if (
            data.email.allow_list !== undefined &&
            hasOwn(data.email, 'allow_list')
          ) {
            if (!Array.isArray(data.email.allow_list)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/allow_list/type',
                instanceLocation: '#/email/allow_list',
              })
              errorCount++
            } else {
              for (let j = 0; j < data.email.allow_list.length; j++) {
                if (
                  data.email.allow_list[j] !== undefined &&
                  hasOwn(data.email.allow_list, j)
                ) {
                  if (!(typeof data.email.allow_list[j] === 'string')) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/email/properties/allow_list/items/type',
                      instanceLocation: '#/email/allow_list/' + j,
                    })
                    errorCount++
                  }
                }
              }
            }
          } else data.email.allow_list = []
          if (data.email.path !== undefined && hasOwn(data.email, 'path')) {
            if (!Array.isArray(data.email.path)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/email/properties/path/type',
                instanceLocation: '#/email/path',
              })
              errorCount++
            } else {
              for (let k = 0; k < data.email.path.length; k++) {
                if (
                  data.email.path[k] !== undefined &&
                  hasOwn(data.email.path, k)
                ) {
                  if (
                    !(
                      typeof data.email.path[k] === 'object' &&
                      data.email.path[k] &&
                      !Array.isArray(data.email.path[k])
                    )
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/email/properties/path/items/type',
                      instanceLocation: '#/email/path/' + k,
                    })
                    errorCount++
                  } else {
                    if (
                      !(
                        data.email.path[k].routes !== undefined &&
                        hasOwn(data.email.path[k], 'routes')
                      )
                    ) {
                      if (validate.errors === null) validate.errors = []
                      validate.errors.push({
                        keywordLocation:
                          '#/properties/email/properties/path/items/required',
                        instanceLocation: '#/email/path/' + k + '/routes',
                      })
                      errorCount++
                    }
                    if (
                      data.email.path[k].routes !== undefined &&
                      hasOwn(data.email.path[k], 'routes')
                    ) {
                      if (!Array.isArray(data.email.path[k].routes)) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/email/properties/path/items/properties/routes/type',
                          instanceLocation: '#/email/path/' + k + '/routes',
                        })
                        errorCount++
                      } else {
                        const prev0 = errorCount
                        if (data.email.path[k].routes.length < 1) {
                          if (validate.errors === null) validate.errors = []
                          validate.errors.push({
                            keywordLocation:
                              '#/properties/email/properties/path/items/properties/routes/minItems',
                            instanceLocation: '#/email/path/' + k + '/routes',
                          })
                          errorCount++
                        }
                        for (
                          let l = 0;
                          l < data.email.path[k].routes.length;
                          l++
                        ) {
                          if (
                            data.email.path[k].routes[l] !== undefined &&
                            hasOwn(data.email.path[k].routes, l)
                          ) {
                            if (
                              !(
                                typeof data.email.path[k].routes[l] === 'string'
                              )
                            ) {
                              if (validate.errors === null) validate.errors = []
                              validate.errors.push({
                                keywordLocation:
                                  '#/properties/email/properties/path/items/properties/routes/items/type',
                                instanceLocation:
                                  '#/email/path/' + k + 'routes/' + l,
                              })
                              errorCount++
                            } else {
                              const prev1 = errorCount
                              if (
                                data.email.path[k].routes[l].length > 2048 &&
                                stringLength(data.email.path[k].routes[l]) >
                                  2048
                              ) {
                                if (validate.errors === null)
                                  validate.errors = []
                                validate.errors.push({
                                  keywordLocation:
                                    '#/properties/email/properties/path/items/properties/routes/items/maxLength',
                                  instanceLocation:
                                    '#/email/path/' + k + 'routes/' + l,
                                })
                                errorCount++
                              }
                              if (errorCount === prev1) {
                                if (
                                  !pattern0.test(data.email.path[k].routes[l])
                                ) {
                                  if (validate.errors === null)
                                    validate.errors = []
                                  validate.errors.push({
                                    keywordLocation:
                                      '#/properties/email/properties/path/items/properties/routes/items/pattern',
                                    instanceLocation:
                                      '#/email/path/' + k + 'routes/' + l,
                                  })
                                  errorCount++
                                }
                              }
                            }
                          }
                        }
                        if (errorCount === prev0) {
                          if (!unique(data.email.path[k].routes)) {
                            if (validate.errors === null) validate.errors = []
                            validate.errors.push({
                              keywordLocation:
                                '#/properties/email/properties/path/items/properties/routes/uniqueItems',
                              instanceLocation: '#/email/path/' + k + '/routes',
                            })
                            errorCount++
                          }
                        }
                      }
                    }
                    if (
                      data.email.path[k].enabled !== undefined &&
                      hasOwn(data.email.path[k], 'enabled')
                    ) {
                      if (!(typeof data.email.path[k].enabled === 'boolean')) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/email/properties/path/items/properties/enabled/type',
                          instanceLocation: '#/email/path/' + k + '/enabled',
                        })
                        errorCount++
                      }
                    }
                    if (
                      data.email.path[k].max_size_bytes !== undefined &&
                      hasOwn(data.email.path[k], 'max_size_bytes')
                    ) {
                      if (
                        !(typeof data.email.path[k].max_size_bytes === 'number')
                      ) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/email/properties/path/items/properties/max_size_bytes/type',
                          instanceLocation:
                            '#/email/path/' + k + '/max_size_bytes',
                        })
                        errorCount++
                      } else {
                        if (!(0 <= data.email.path[k].max_size_bytes)) {
                          if (validate.errors === null) validate.errors = []
                          validate.errors.push({
                            keywordLocation:
                              '#/properties/email/properties/path/items/properties/max_size_bytes/minimum',
                            instanceLocation:
                              '#/email/path/' + k + '/max_size_bytes',
                          })
                          errorCount++
                        }
                      }
                    }
                    if (
                      data.email.path[k].attachments !== undefined &&
                      hasOwn(data.email.path[k], 'attachments')
                    ) {
                      if (
                        !(typeof data.email.path[k].attachments === 'boolean')
                      ) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/email/properties/path/items/properties/attachments/type',
                          instanceLocation:
                            '#/email/path/' + k + '/attachments',
                        })
                        errorCount++
                      }
                    }
                    if (
                      data.email.path[k].allow_list !== undefined &&
                      hasOwn(data.email.path[k], 'allow_list')
                    ) {
                      if (!Array.isArray(data.email.path[k].allow_list)) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/email/properties/path/items/properties/allow_list/type',
                          instanceLocation: '#/email/path/' + k + '/allow_list',
                        })
                        errorCount++
                      } else {
                        for (
                          let m = 0;
                          m < data.email.path[k].allow_list.length;
                          m++
                        ) {
                          if (
                            data.email.path[k].allow_list[m] !== undefined &&
                            hasOwn(data.email.path[k].allow_list, m)
                          ) {
                            if (
                              !(
                                typeof data.email.path[k].allow_list[m] ===
                                'string'
                              )
                            ) {
                              if (validate.errors === null) validate.errors = []
                              validate.errors.push({
                                keywordLocation:
                                  '#/properties/email/properties/path/items/properties/allow_list/items/type',
                                instanceLocation:
                                  '#/email/path/' + k + 'allow_list/' + m,
                              })
                              errorCount++
                            }
                          }
                        }
                      }
                    }
                    if (
                      data.email.path[k].allow_extra !== undefined &&
                      hasOwn(data.email.path[k], 'allow_extra')
                    ) {
                      if (!Array.isArray(data.email.path[k].allow_extra)) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/email/properties/path/items/properties/allow_extra/type',
                          instanceLocation:
                            '#/email/path/' + k + '/allow_extra',
                        })
                        errorCount++
                      } else {
                        for (
                          let n = 0;
                          n < data.email.path[k].allow_extra.length;
                          n++
                        ) {
                          if (
                            data.email.path[k].allow_extra[n] !== undefined &&
                            hasOwn(data.email.path[k].allow_extra, n)
                          ) {
                            if (
                              !(
                                typeof data.email.path[k].allow_extra[n] ===
                                'string'
                              )
                            ) {
                              if (validate.errors === null) validate.errors = []
                              validate.errors.push({
                                keywordLocation:
                                  '#/properties/email/properties/path/items/properties/allow_extra/items/type',
                                instanceLocation:
                                  '#/email/path/' + k + 'allow_extra/' + n,
                              })
                              errorCount++
                            }
                          }
                        }
                      }
                    } else data.email.path[k].allow_extra = []
                    for (const key0 of Object.keys(data.email.path[k])) {
                      if (
                        key0 !== 'routes' &&
                        key0 !== 'enabled' &&
                        key0 !== 'max_size_bytes' &&
                        key0 !== 'attachments' &&
                        key0 !== 'allow_list' &&
                        key0 !== 'allow_extra'
                      ) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/email/properties/path/items/additionalProperties',
                          instanceLocation:
                            '#/email/path/' + k + '/' + pointerPart(key0),
                        })
                        errorCount++
                      }
                    }
                  }
                }
              }
            }
          } else data.email.path = []
          for (const key1 of Object.keys(data.email)) {
            if (
              key1 !== 'enabled' &&
              key1 !== 'subject' &&
              key1 !== 'max_size_bytes' &&
              key1 !== 'attachments' &&
              key1 !== 'block_list' &&
              key1 !== 'allow_list' &&
              key1 !== 'path'
            ) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/email/additionalProperties',
                instanceLocation: '#/email/' + pointerPart(key1),
              })
              errorCount++
            }
          }
        }
      } else
        data.email = {
          enabled: true,
          subject: 'path',
          max_size_bytes: 1048576,
          attachments: false,
          block_list: [],
          allow_list: [],
          path: [],
        }
      for (const key2 of Object.keys(data)) {
        if (
          key2 !== 'version' &&
          key2 !== 'enabled' &&
          key2 !== 'paused' &&
          key2 !== 'email'
        ) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/additionalProperties',
            instanceLocation: '#/' + pointerPart(key2),
          })
          errorCount++
        }
      }
    }
    return errorCount === 0
  }
  const parseWrap = (validate) => (src) => {
    if (typeof src !== 'string')
      return { valid: false, error: 'Input is not a string' }
    try {
      const value = JSON.parse(src)
      if (!validate(value)) {
        const { keywordLocation, instanceLocation } = validate.errors[0]
        const keyword = keywordLocation.slice(
          keywordLocation.lastIndexOf('/') + 1,
        )
        const error = `JSON validation failed for ${keyword} at ${instanceLocation}`
        return { valid: false, error, errors: validate.errors }
      }
      return { valid: true, value }
    } catch ({ message }) {
      return { valid: false, error: message }
    }
  }
  return parseWrap(ref0)
})()

// A wrapper that adds type safety.
export const parser = (input: string): TypedParseResult<R3plySiteConfig> => {
  const parse_result = raw_parser(input) as ParseResult
  return parse_result as TypedParseResult<R3plySiteConfig>
}
