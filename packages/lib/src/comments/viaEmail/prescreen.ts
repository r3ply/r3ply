import micromatch from 'micromatch'
import { R3plySiteConfig, R3plySystemConfig } from '@r3ply/schema/config'
import {
  R3plyCommentsConfig,
  R3plyCommentSource,
  R3plyEmailCommentsConfig,
} from '@r3ply/schema/config/comments'
import { Err, Ok, Result } from 'oxide.ts'

namespace PrescreenChecks {
  export namespace r3ply_is_disabled {
    export type pass = {
      result: 'pass'
      site: false
      system: false
    }
    export type fail = {
      result: 'fail'
      errors: [string, ...string[]]
      site: boolean
      system: boolean
    }
  }
  export type r3ply_is_disabled =
    | r3ply_is_disabled.pass
    | r3ply_is_disabled.fail
  export namespace comments_accepted {
    export type pass = {
      result: 'pass'
      system_for_site: true
      site_from_system: true
    }
    export type fail = {
      result: 'fail'
      errors: [string, ...string[]]
      system_for_site: boolean
      site_from_system: boolean
    }
  }
  export type comments_accepted =
    | comments_accepted.pass
    | comments_accepted.fail
  export namespace comments_configured {
    export type pass = {
      result: 'pass'
      general_comments: R3plyCommentsConfig
      email_comments: R3plyEmailCommentsConfig
    }
    export type fail = {
      result: 'fail'
      errors: [string, ...string[]]
      general_comments?: R3plyCommentsConfig
      email_comments?: R3plyEmailCommentsConfig
    }
  }
  export type comments_configured =
    | comments_configured.pass
    | comments_configured.fail
  export namespace email_size_bytes {
    export type pass = {
      result: 'pass'
      bytes_received: number
      max_bytes_allowed: number
    }
    export type fail = {
      result: 'fail'
      errors: [string, ...string[]]
      bytes_received: number
      max_bytes_allowed: number
    }
  }
  export type email_size_bytes = email_size_bytes.pass | email_size_bytes.fail
}
export interface PrescreenResult {
  result: 'pass' | 'fail'
  r3ply_is_disabled: PrescreenChecks.r3ply_is_disabled
  comments_accepted: PrescreenChecks.comments_accepted
  comments_configured: PrescreenChecks.comments_configured
  email_size_bytes: PrescreenChecks.email_size_bytes
}
export type PrescreenPass = PrescreenResult & {
  result: 'pass'
  r3ply_is_disabled: PrescreenChecks.r3ply_is_disabled.pass
  comments_accepted: PrescreenChecks.comments_accepted.pass
  comments_configured: PrescreenChecks.comments_configured.pass
  email_size_bytes: PrescreenChecks.email_size_bytes.pass
}
export type PrescreenFail = PrescreenResult & {
  result: 'fail'
}

/**
 * This function acts as an assertion before processing an email any further.
 * @param email an object that contains various things to check about the email
 * @param config site config
 * @param system system config
 * @returns void if ok, otherwise throws an error
 *
 * // TODO: replace these error types with something more specific
 */
export function prescreen(
  email: {
    size_bytes: number
  },
  config: R3plySiteConfig,
  system: R3plySystemConfig,
): Result<PrescreenPass, PrescreenFail> {
  // Check if system and site are enabled
  const r3ply_is_disabled_check = r3ply_is_disabled(
    system.enabled,
    system.domains,
    config.enabled,
    config.site.map((site) => site.domain),
  )
  // Check if comments are accepted
  const comments_accepted_check = comments_accepted(system, config)
  // Check if comments are configured for site (both generally and for email)
  const comments_configured_check = comments_configured_and_enabled(config)
  // Check if incoming email exceeds min of system or site configurations
  const email_size_bytes_check = email_size_exceeds_max(
    email.size_bytes,
    Math.min(
      comments_configured_check.mapOr(
        Number.POSITIVE_INFINITY,
        (check) => check.email_comments.max_size_bytes,
      ),
      system.email.max_size_bytes,
    ),
  )

  // Return final results
  const prescreen_checks = Result.all(
    r3ply_is_disabled_check,
    comments_accepted_check,
    comments_configured_check,
    email_size_bytes_check,
  )
  if (prescreen_checks.isOk()) {
    const pass = prescreen_checks.unwrap()
    return Ok({
      result: 'pass',
      r3ply_is_disabled: pass[0],
      comments_accepted: pass[1],
      comments_configured: pass[2],
      email_size_bytes: pass[3],
    })
  } else {
    return Err({
      result: 'fail',
      r3ply_is_disabled: r3ply_is_disabled_check.unwrapUnchecked(),
      comments_accepted: comments_accepted_check.unwrapUnchecked(),
      comments_configured: comments_configured_check.unwrapUnchecked(),
      email_size_bytes: email_size_bytes_check.unwrapUnchecked(),
    })
  }
}

// Check if r3ply is disabled
function r3ply_is_disabled(
  system_enabled: boolean,
  system_domains: string[],
  site_enabled: boolean,
  site_domains: string[],
): Result<
  PrescreenChecks.r3ply_is_disabled.pass,
  PrescreenChecks.r3ply_is_disabled.fail
> {
  let errors: string[] = []
  const system_disabled = !system_enabled
  const site_disabled = !site_enabled
  if (system_disabled) {
    errors = errors.concat(
      `r3ply has been disabled at the system-level config for domains: ${system_domains}`,
    )
  }
  if (site_disabled) {
    errors = errors.concat(
      `r3ply has been disabled at the site-level config for domains: ${site_domains}`,
    )
  }
  if (!system_disabled && !site_disabled) {
    return Ok({
      result: 'pass',
      system: system_disabled,
      site: site_disabled,
    })
  } else {
    return Err({
      result: 'fail',
      system: system_disabled,
      site: site_disabled,
      errors: errors as [string, ...string[]],
    })
  }
}
namespace r3ply_is_disabled {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('r3ply_is_disabled', () => {
      test('r3ply disabled at system-level', () => {
        const [failed] = r3ply_is_disabled(false, ['r3ply.com'], true, [
          'example.com',
        ]).intoTuple()
        expect(failed?.errors).toStrictEqual([
          'r3ply has been disabled at the system-level config for domains: r3ply.com',
        ])
      })
      test('r3ply disabled at site-level', () => {
        const [failed] = r3ply_is_disabled(true, ['r3ply.com'], false, [
          'example.com',
        ]).intoTuple()
        expect(failed?.errors).toStrictEqual([
          'r3ply has been disabled at the site-level config for domains: example.com',
        ])
      })
      test('r3ply disabled at both system and site levels', () => {
        const [failed] = r3ply_is_disabled(false, ['r3ply.com'], false, [
          'example.com',
        ]).intoTuple()
        expect(failed?.errors).toStrictEqual([
          'r3ply has been disabled at the system-level config for domains: r3ply.com',
          'r3ply has been disabled at the site-level config for domains: example.com',
        ])
      })
      test('r3ply is enabled at both system and site levels', () => {
        const [, success] = r3ply_is_disabled(true, ['r3ply.com'], true, [
          'example.com',
        ]).intoTuple()
        expect(success?.result).toBe('pass')
      })
    })
  }
}

// Check if comments are accepted
function comments_accepted(
  system: R3plySystemConfig,
  config: R3plySiteConfig,
): Result<
  PrescreenChecks.comments_accepted.pass,
  PrescreenChecks.comments_accepted.fail
> {
  let errors: string[] = []
  // Check if system accepts comments on behalf of site
  let system_pass = false
  if (system['sites*']) {
    const system_check = Result.safe(() =>
      comments_accepted.system_accepts_comments_for_site(
        config.site.map((site) => site.domain),
        system['sites*']!,
      ),
    )
    if (system_check.isErr()) {
      errors = errors.concat(system_check.unwrapErr().message)
    } else {
      system_pass = true
    }
  } else {
    system_pass = true
  }

  // Check if site accepts comments from system
  const site_check = Result.safe(() =>
    comments_accepted.site_accepts_comments_from_system(
      config.site.map((site) => site.r3ply),
      system.domains,
    ),
  )
  if (site_check.isErr()) {
    errors = errors.concat(site_check.unwrapErr().message)
  }
  // Return either a pass or fail result object
  if (system_pass && site_check.isOk() && errors.length == 0) {
    return Ok({
      result: 'pass',
      system_for_site: true,
      site_from_system: true,
    })
  } else {
    return Err({
      result: 'fail',
      errors: errors as [string, ...string[]],
      system_for_site: system_pass,
      site_from_system: site_check.isOk(),
    })
  }
}
namespace comments_accepted {
  export function system_accepts_comments_for_site(
    site_domains: string[],
    accepted_site_list: string[],
  ) {
    const matches = micromatch(site_domains, accepted_site_list)
    if (matches.length == 0)
      throw new Error(
        `System's accepted site list ${JSON.stringify(accepted_site_list)} does not accept comments on behalf of any of the configured site's domains ${JSON.stringify(site_domains, null, 2)}`,
      )
  }
  export function site_accepts_comments_from_system(
    site_r3ply_list: string[],
    system_domains: string[],
  ) {
    const matches = micromatch(system_domains, site_r3ply_list)
    if (matches.length == 0)
      throw new Error(
        `Site's configured r3ply list ${JSON.stringify(site_r3ply_list)} does not accept comments from any of these of these configured r3ply domains: ${JSON.stringify(system_domains, null, 2)}`,
      )
  }
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('comments_accepted', () => {
      test('comments not accepted by system on behalf of site', () => {
        const system = R3plySystemConfig({
          domains: ['r3ply.com'],
          'sites*': [],
        }).value!
        const site = R3plySiteConfig({
          site: [
            {
              domain: 'example.com',
              r3ply: 'r3ply.com',
              signet: 'a'.repeat(22),
              issued: '2025-10-11',
            },
          ],
        }).value!
        const [failed] = comments_accepted(system, site).intoTuple()
        const [error, ...others] = failed?.errors!
        expect(error).toMatch(
          /does not accept comments on behalf of .* "example.com"/s,
        )
        expect(others).toStrictEqual([])
      })
      test('comments not accepted by site from system', () => {
        const system = R3plySystemConfig({
          domains: ['r3ply.com'],
          'sites*': ['example.com'],
        }).value!
        const site = R3plySiteConfig({
          site: [
            {
              domain: 'example.com',
              r3ply: 'other.com',
              signet: 'a'.repeat(22),
              issued: '2025-10-11',
            },
          ],
        }).value!
        const [failed] = comments_accepted(system, site).intoTuple()
        const [error, ...others] = failed?.errors!
        expect(error).toMatch(/does not accept comments from .* "r3ply.com"/s)
        expect(others).toStrictEqual([])
      })
      test('comments not accepted by/from either system or site', () => {
        const system = R3plySystemConfig({
          domains: ['r3ply.com'],
          'sites*': ['pets.com'],
        }).value!
        const site = R3plySiteConfig({
          site: [
            {
              domain: 'example.com',
              r3ply: 'other.com',
              signet: 'a'.repeat(22),
              issued: '2025-10-11',
            },
          ],
        }).value!
        const [failed] = comments_accepted(system, site).intoTuple()
        const [system_error, site_error, ...others] = failed?.errors!
        expect(system_error).toMatch(
          /does not accept comments on behalf of .* "example.com"/s,
        )
        expect(site_error).toMatch(
          /does not accept comments from .* "r3ply.com"/s,
        )
        expect(others).toStrictEqual([])
      })
      test('default is comments should be accepted by system on behalf of any site', () => {
        const system = R3plySystemConfig({
          domains: ['r3ply.com'],
        }).value!
        const site = R3plySiteConfig({
          site: [
            {
              domain: 'example.com',
              r3ply: 'r3ply.com',
              signet: 'a'.repeat(22),
              issued: '2025-10-11',
            },
          ],
        }).value!
        const [, success] = comments_accepted(system, site).intoTuple()
        expect(success?.result).toBe('pass')
      })
      test('default is no site accepts comments from a r3ply system, without explicitly saying so', () => {
        const system = R3plySystemConfig({
          domains: ['r3ply.com'],
        }).value!
        const site = R3plySiteConfig({}).value!
        const [failure] = comments_accepted(system, site).intoTuple()
        const [error, ...others] = failure?.errors!
        expect(error).toMatch(
          /Site's configured r3ply list \[\] does not accept comments from .* "r3ply.com"/s,
        )
        expect(others).toStrictEqual([])
      })
    })
  }
}

// Check if comments are configured and enabled (both generally and for emails)
function comments_configured_and_enabled(
  config: R3plySiteConfig,
  comment_source?: R3plyCommentSource,
): Result<
  PrescreenChecks.comments_configured.pass,
  PrescreenChecks.comments_configured.fail
> {
  // Check that comments are configured for the site (if no comments config, then no email comments config either)
  const comments_config_exists = Result.safe(() =>
    comments_configured_and_enabled.comments_config_exists(config),
  )
  if (comments_config_exists.isErr()) {
    return Err({
      result: 'fail',
      errors: [comments_config_exists.unwrapErr().message],
      general_comments: undefined,
    })
  }
  const comments_config = comments_config_exists.unwrap()
  const comments_enabled = Result.safe(() =>
    comments_configured_and_enabled.comments_config_enabled(comments_config),
  )
  if (comments_enabled.isErr()) {
    return Err({
      result: 'fail',
      errors: [comments_enabled.unwrapErr().message],
      general_comments: undefined,
    })
  }
  // Check that comments are configured for the comment source
  const email_comments_config_exists = Result.safe(() =>
    comments_configured_and_enabled.email_comments_config_exists(
      comments_config,
    ),
  )
  if (email_comments_config_exists.isErr()) {
    return Err({
      result: 'fail',
      errors: [email_comments_config_exists.unwrapErr().message],
      general_comments: comments_config,
    })
  }
  const email_comments_config = email_comments_config_exists.unwrap()
  const email_comments_enabled = Result.safe(() =>
    comments_configured_and_enabled.email_comments_config_enabled(
      email_comments_config,
    ),
  )
  if (email_comments_enabled.isErr()) {
    return Err({
      result: 'fail',
      errors: [email_comments_enabled.unwrapErr().message],
      general_comments: comments_config,
    })
  }
  // Safe to return a pass after checking all branches
  return Ok({
    result: 'pass',
    general_comments: comments_config,
    email_comments: email_comments_config,
  })
}
namespace comments_configured_and_enabled {
  export function comments_config_exists(config: R3plySiteConfig) {
    const comments_config = config.comments
    if (comments_config) return comments_config
    else throw new Error('No comments configuration found')
  }
  export function comments_config_enabled(config: R3plyCommentsConfig) {
    if (config.enabled) return true
    else throw new Error('Comments disabled')
  }
  export function email_comments_config_exists(comments: R3plyCommentsConfig) {
    const email_comments_config = comments.email
    if (email_comments_config) return email_comments_config
    else throw new Error('No configuration found for email comments')
  }
  export function email_comments_config_enabled(
    config: R3plyEmailCommentsConfig,
  ) {
    if (config.enabled) return true
    else throw new Error('Email comments disabled')
  }
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('comments_configured', () => {
      test('comments are not configured by default', () => {
        const [failure] = comments_configured_and_enabled(
          R3plySiteConfig({}).value!,
        ).intoTuple()
        expect(failure?.errors).toStrictEqual([
          'No comments configuration found',
        ])
      })
      test('comments are not configured for email by default', () => {
        const [failure] = comments_configured_and_enabled(
          R3plySiteConfig({ comments: {} }).value!,
        ).intoTuple()
        expect(failure?.errors).toStrictEqual([
          'No configuration found for email comments',
        ])
      })
      test('comments are enabled generally and for email by default', () => {
        const [, success] = comments_configured_and_enabled(
          R3plySiteConfig({ comments: { email: {} } }).value!,
        ).intoTuple()
        expect(success?.result).toBe('pass')
      })
      test('comments can generally be disabled', () => {
        const [failure] = comments_configured_and_enabled(
          R3plySiteConfig({
            comments: { enabled: false, email: { enabled: false } },
          }).value!,
        ).intoTuple()
        expect(failure?.errors).toStrictEqual(['Comments disabled'])
      })
      test('Email comments can be disabled', () => {
        const [failure] = comments_configured_and_enabled(
          R3plySiteConfig({
            comments: { enabled: true, email: { enabled: false } },
          }).value!,
        ).intoTuple()
        expect(failure?.errors).toStrictEqual(['Email comments disabled'])
      })
    })
  }
}

// Check if the email size exceeds what is allowed
function email_size_exceeds_max(
  input_size: number,
  max_allowed: number,
): Result<
  PrescreenChecks.email_size_bytes.pass,
  PrescreenChecks.email_size_bytes.fail
> {
  const check_size_result = Result.safe(() =>
    email_size_exceeds_max.check_size(input_size, max_allowed),
  )
  if (check_size_result.isErr()) {
    return Err({
      result: 'fail',
      errors: [check_size_result.unwrapErr().message],
      bytes_received: input_size,
      max_bytes_allowed: max_allowed,
    })
  } else {
    return Ok({
      result: 'pass',
      bytes_received: input_size,
      max_bytes_allowed: max_allowed,
    })
  }
}
namespace email_size_exceeds_max {
  export function check_size(input_size: number, max_allowed: number) {
    if (input_size < 0)
      throw new Error('Email input size (bytes) must be non-negative')
    if (max_allowed < 0)
      throw new Error('Max allowed email size (bytes) must be non-negative')
    if (input_size > max_allowed)
      throw new Error(`Email exceeded max of: ${max_allowed} bytes`)
  }
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('email_size_exceeds_max', () => {
      test('Email input size (bytes) must be non-negative', () => {
        const [failed] = email_size_exceeds_max(-1, 123).intoTuple()
        expect(failed?.errors).toStrictEqual([
          'Email input size (bytes) must be non-negative',
        ])
      })
      test('Max allowed email size (bytes) must be non-negative', () => {
        const [failed] = email_size_exceeds_max(456, -1).intoTuple()
        expect(failed?.errors).toStrictEqual([
          'Max allowed email size (bytes) must be non-negative',
        ])
      })
      test('Email exceeded max bytes', () => {
        const [failed] = email_size_exceeds_max(456, 123).intoTuple()
        expect(failed?.errors).toStrictEqual([
          `Email exceeded max of: 123 bytes`,
        ])
      })
      test('Email size allowed', () => {
        const [, success] = email_size_exceeds_max(123, 456).intoTuple()
        expect(success?.result).toBe('pass')
      })
    })
  }
}
