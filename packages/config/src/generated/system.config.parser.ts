// @ts-nocheck
/** This file is generated. DO NOT EDIT. */
import { ParseResult } from '@exodus/schemasafe'
import { FromSchema } from 'json-schema-to-ts'

const schema = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply system config schema v0.0.1',
  description:
    'JSON Schema to describe the configuration of a r3ply system. See https://r3ply.com for more info.',
  type: 'object',
  required: ['version', 'domain', 'admin'],
  additionalProperties: false,
  properties: {
    version: {
      description:
        'used to determine what version of the schema to use (and the version of r3ply)',
      type: 'string',
      enum: ['0.0.1'],
    },
    domain: {
      description:
        'this is the domain that is hosting the r3ply system, e.g. where emails are sent to',
      type: 'string',
      pattern:
        '^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.(?!-)(?:[A-Za-z0-9-]{1,63}\\.)*[A-Za-z]{2,63}$',
      maxLength: 253,
      examples: ['r3ply.com'],
    },
    enabled: {
      description: 'If false, system will skip any requests it receives',
      type: 'boolean',
      default: true,
    },
    sites: {
      type: 'array',
      items: { type: 'string', pattern: '^[\\S]*$', maxLength: 128 },
      default: ['*'],
    },
    admin: {
      type: 'array',
      description: 'list of system-wide admins',
      minItems: 1,
      maxItems: 99,
      uniqueItems: true,
      items: {
        description: 'a name + email pair of each admin',
        type: 'object',
        required: ['name', 'email'],
        additionalProperties: false,
        properties: {
          name: {
            description: 'human readble name of the admin',
            type: 'string',
            pattern: '^[\\s\\S]*$',
            examples: ['Guybrush Threepwood'],
          },
          email: {
            description: 'the email of the admin',
            type: 'string',
            format: 'email',
            examples: ['guybrush@example.com'],
            $comment:
              'Do not use mailbox format, e.g. "Le Chuck GP <ghostlechuck@lucasart.com>"',
          },
        },
      },
    },
    email: {
      description:
        'Configure parameters related to processing comments via email for sites',
      type: 'object',
      required: [],
      additionalProperties: false,
      default: {
        enabled: true,
        moderation: false,
        attachments: true,
        max_size_bytes: 5242880,
        block_list: [],
      },
      properties: {
        enabled: {
          description: 'If false, all emails are ignored',
          type: 'boolean',
          default: true,
          $comment:
            '⚠️: if disabled, site configs for `enabed` will be ignored',
        },
        moderation: {
          description:
            'If false, replies to comments from site moderators are ignored',
          type: 'boolean',
          default: true,
          $comment:
            'Note: emails concerning moderation MUST have dkim, dmarc, and spf enabled',
        },
        max_size_bytes: {
          description:
            'Emails are ignored if their size (in bytes) exceed the min(system, site) configs',
          type: 'number',
          default: 5242880,
          $comment: 'Note: default is 5 MB',
          minimum: 0,
        },
        attachments: {
          description: 'If false attachments are ignored',
          type: 'boolean',
          default: false,
          $comment:
            'Warning: if disabled, site configs for attachments will be ignored',
        },
        block_list: {
          description:
            'system-wide block list, works upstream of site blocklists',
          type: 'array',
          default: [],
          items: { type: 'string', pattern: '^[\\s\\S]*$' },
          $comment:
            'globbing patterns can be used, otherwise matches must be exact',
        },
      },
    },
  },
} as const

type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}

export type R3plySystemConfig = FromSchema<typeof schema>

// The generated raw parser function.
const raw_parser = (function () {
  'use strict'
  const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty)
  const stringLength = (string) =>
    /[\uD800-\uDFFF]/.test(string) ? [...string].length : string.length
  const pattern0 = new RegExp(
    '^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.(?!-)(?:[A-Za-z0-9-]{1,63}\\.)*[A-Za-z]{2,63}$',
    'u',
  )
  const pattern1 = new RegExp('^[\\S]*$', 'u')
  const format0 = (input) => {
    if (input.length > 318) return false
    const fast =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]{1,20}(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]{1,21}){0,2}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?){0,3}$/i
    if (fast.test(input)) return true
    if (!input.includes('@') || /(^\.|^"|\.@|\.\.)/.test(input)) return false
    const [name, host, ...rest] = input.split('@')
    if (
      !name ||
      !host ||
      rest.length !== 0 ||
      name.length > 64 ||
      host.length > 253
    )
      return false
    if (
      !/^[a-z0-9.-]+$/i.test(host) ||
      !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(name)
    )
      return false
    return host
      .split('.')
      .every((part) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(part))
  }
  const pointerPart = (s) =>
    /~\//.test(s) ? `${s}`.replace(/~/g, '~0').replace(/\//g, '~1') : s
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
      if (!(data.domain !== undefined && hasOwn(data, 'domain'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/domain',
        })
        errorCount++
      }
      if (!(data.admin !== undefined && hasOwn(data, 'admin'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/admin',
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
      if (data.domain !== undefined && hasOwn(data, 'domain')) {
        if (!(typeof data.domain === 'string')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/domain/type',
            instanceLocation: '#/domain',
          })
          errorCount++
        } else {
          const prev0 = errorCount
          if (data.domain.length > 253 && stringLength(data.domain) > 253) {
            if (validate.errors === null) validate.errors = []
            validate.errors.push({
              keywordLocation: '#/properties/domain/maxLength',
              instanceLocation: '#/domain',
            })
            errorCount++
          }
          if (errorCount === prev0) {
            if (!pattern0.test(data.domain)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/domain/pattern',
                instanceLocation: '#/domain',
              })
              errorCount++
            }
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
      if (data.sites !== undefined && hasOwn(data, 'sites')) {
        if (!Array.isArray(data.sites)) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/sites/type',
            instanceLocation: '#/sites',
          })
          errorCount++
        } else {
          for (let i = 0; i < data.sites.length; i++) {
            if (data.sites[i] !== undefined && hasOwn(data.sites, i)) {
              if (!(typeof data.sites[i] === 'string')) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/properties/sites/items/type',
                  instanceLocation: '#/sites/' + i,
                })
                errorCount++
              } else {
                const prev1 = errorCount
                if (
                  data.sites[i].length > 128 &&
                  stringLength(data.sites[i]) > 128
                ) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/properties/sites/items/maxLength',
                    instanceLocation: '#/sites/' + i,
                  })
                  errorCount++
                }
                if (errorCount === prev1) {
                  if (!pattern1.test(data.sites[i])) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation: '#/properties/sites/items/pattern',
                      instanceLocation: '#/sites/' + i,
                    })
                    errorCount++
                  }
                }
              }
            }
          }
        }
      } else data.sites = ['*']
      if (data.admin !== undefined && hasOwn(data, 'admin')) {
        if (!Array.isArray(data.admin)) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/admin/type',
            instanceLocation: '#/admin',
          })
          errorCount++
        } else {
          const prev2 = errorCount
          if (data.admin.length > 99) {
            if (validate.errors === null) validate.errors = []
            validate.errors.push({
              keywordLocation: '#/properties/admin/maxItems',
              instanceLocation: '#/admin',
            })
            errorCount++
          }
          if (data.admin.length < 1) {
            if (validate.errors === null) validate.errors = []
            validate.errors.push({
              keywordLocation: '#/properties/admin/minItems',
              instanceLocation: '#/admin',
            })
            errorCount++
          }
          for (let j = 0; j < data.admin.length; j++) {
            if (data.admin[j] !== undefined && hasOwn(data.admin, j)) {
              if (
                !(
                  typeof data.admin[j] === 'object' &&
                  data.admin[j] &&
                  !Array.isArray(data.admin[j])
                )
              ) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/properties/admin/items/type',
                  instanceLocation: '#/admin/' + j,
                })
                errorCount++
              } else {
                if (
                  !(
                    data.admin[j].name !== undefined &&
                    hasOwn(data.admin[j], 'name')
                  )
                ) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/properties/admin/items/required',
                    instanceLocation: '#/admin/' + j + '/name',
                  })
                  errorCount++
                }
                if (
                  !(
                    data.admin[j].email !== undefined &&
                    hasOwn(data.admin[j], 'email')
                  )
                ) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/properties/admin/items/required',
                    instanceLocation: '#/admin/' + j + '/email',
                  })
                  errorCount++
                }
                if (
                  data.admin[j].name !== undefined &&
                  hasOwn(data.admin[j], 'name')
                ) {
                  if (!(typeof data.admin[j].name === 'string')) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/admin/items/properties/name/type',
                      instanceLocation: '#/admin/' + j + '/name',
                    })
                    errorCount++
                  }
                }
                if (
                  data.admin[j].email !== undefined &&
                  hasOwn(data.admin[j], 'email')
                ) {
                  if (!(typeof data.admin[j].email === 'string')) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/admin/items/properties/email/type',
                      instanceLocation: '#/admin/' + j + '/email',
                    })
                    errorCount++
                  } else {
                    const prev3 = errorCount
                    if (errorCount === prev3) {
                      if (!format0(data.admin[j].email)) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/properties/admin/items/properties/email/format',
                          instanceLocation: '#/admin/' + j + '/email',
                        })
                        errorCount++
                      }
                    }
                  }
                }
                for (const key0 of Object.keys(data.admin[j])) {
                  if (key0 !== 'name' && key0 !== 'email') {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/admin/items/additionalProperties',
                      instanceLocation:
                        '#/admin/' + j + '/' + pointerPart(key0),
                    })
                    errorCount++
                  }
                }
              }
            }
          }
          if (errorCount === prev2) {
            if (!unique(data.admin)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/admin/uniqueItems',
                instanceLocation: '#/admin',
              })
              errorCount++
            }
          }
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
            data.email.moderation !== undefined &&
            hasOwn(data.email, 'moderation')
          ) {
            if (!(typeof data.email.moderation === 'boolean')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/moderation/type',
                instanceLocation: '#/email/moderation',
              })
              errorCount++
            }
          } else data.email.moderation = true
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
          } else data.email.max_size_bytes = 5242880
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
              for (let k = 0; k < data.email.block_list.length; k++) {
                if (
                  data.email.block_list[k] !== undefined &&
                  hasOwn(data.email.block_list, k)
                ) {
                  if (!(typeof data.email.block_list[k] === 'string')) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/email/properties/block_list/items/type',
                      instanceLocation: '#/email/block_list/' + k,
                    })
                    errorCount++
                  }
                }
              }
            }
          } else data.email.block_list = []
          for (const key1 of Object.keys(data.email)) {
            if (
              key1 !== 'enabled' &&
              key1 !== 'moderation' &&
              key1 !== 'max_size_bytes' &&
              key1 !== 'attachments' &&
              key1 !== 'block_list'
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
          moderation: false,
          attachments: true,
          max_size_bytes: 5242880,
          block_list: [],
        }
      for (const key2 of Object.keys(data)) {
        if (
          key2 !== 'version' &&
          key2 !== 'domain' &&
          key2 !== 'enabled' &&
          key2 !== 'sites' &&
          key2 !== 'admin' &&
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
export const parser = (input: string): TypedParseResult<R3plySystemConfig> => {
  const parse_result = raw_parser(input) as ParseResult
  return parse_result as TypedParseResult<R3plySystemConfig>
}
