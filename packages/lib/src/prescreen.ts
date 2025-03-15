import micromatch from 'micromatch'
import { R3plySiteConfig, R3plySystemConfig } from '@r3ply/config'

/**
 * This function acts as an assertion before processing an email any further.
 * @param checks an object that contains various things to check
 * @param site	site config
 * @param system	system config
 * @returns void if ok, otherwise throws an error
 *
 * // TODO: replace these error types with something more specific
 */
export function prescreen(
  checks: {
    email_size_bytes: number
  },
  site: R3plySiteConfig,
  system: R3plySystemConfig,
): void {
  // Check if system and site are enabled
  r3ply_is_disabled(system.enabled, system.domain, site.enabled, site.domain)
  // Check if system accepts comments on behalf of site
  system_accepts_comments_for_site(site.domain, system.sites)
  // Check if site accepts comments from system
  site_accepts_comments_from_system(site.r3ply, system.domain)
  // Check if incoming email exceeds min of system or site configurations
  const max_bytes_allowed = Math.min(
    site.comments.email.max_size_bytes,
    system.email.max_size_bytes,
  )
  email_size_exceeds_max(checks.email_size_bytes, max_bytes_allowed)
  // // Check if from matches either system or site blocklists
  // check_blocklist(checks.from, system.email.block_list, site.comments.email.block_list)
}

/**
 * Note about testing:
 *
 * These functions are simple and do very straightforward checks that could easily be done in
 * a parent function. However, it's also easy to make mistakes, and they include in-source
 * unit tests. That way, the individual logic of the prescreen checks can be looked at more
 * closely, and tested without having to have dependencies, like configs, with an aim to catch
 * regressions in the future and to test everything extremely thoroughly.
 *
 * Therefore, in-source tests should be used to test very small, private functions. Basically,
 * micro testing. Anything that is exported should also be tested, outside of source, in
 * dedicated test files. In other words unit tests.
 *
 * By design this library should not require any integration testing, outside of checking that
 * it's properly exported and can be imported in different environments.
 *
 * Writing code this way is an iterative process, but it gives insight as to the larger design.
 * How big should a function be? Ultimately you should have a known pre-condition and
 * post-condition for all the critical parts of this code. So these small little functions,
 * are demonstrations of that in practice. If you can't reduce a function to an easily known
 * pre and post condition, then it should be broken up into smaller, private functions that are
 * all micro tested.
 *
 * It may seem tedious but the code in the end will be much more correct and more ergonomic,
 * because you are constantly using it in the process of testing it. Additionally, these small,
 * private functions by their very nature don't have dependencies, so they should not break too
 * much and require constant updating.
 *
 * Larger functions can focus on APIs and usability, and the process for gleaning insight into
 * that is achieved through the unit testing.
 */

function check_blocklist(
  from: string[],
  system_block: string[],
  site_block: string[],
) {
  if (micromatch(from, system_block).length > 0)
    throw new Error(
      `Sender matched system blocklist: ${micromatch(from, system_block)}`,
    )
  if (micromatch(from, site_block).length > 0)
    throw new Error(
      `Sender matched site blocklist: ${micromatch(from, site_block)}`,
    )
}
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('check_blocklist', () => {
    expect(() => check_blocklist([], [], [])).not.toThrowError()
    expect(() => check_blocklist(['a'], [], [])).not.toThrowError()
    expect(() => check_blocklist(['a', 'ab'], ['a*'], [])).toThrowError(
      /system .*? a,ab/,
    )
    expect(() => check_blocklist(['a', 'ab'], [], ['a*'])).toThrowError(
      /site .*? a,ab/,
    )
    expect(() =>
      check_blocklist(['a', 'ab', 'ac', 'ad'], [], ['a{b,c}']),
    ).toThrowError(/site .*? ab,ac/)
    expect(() => check_blocklist(['abc'], [], ['a*c'])).toThrowError(
      /site .*? abc/,
    )
  })
}

function r3ply_is_disabled(
  system_enabled: boolean,
  system_domain: string,
  site_enabled: boolean,
  site_domain: string,
) {
  if (!system_enabled)
    throw new Error(
      `r3ply has been disabled at the system-level config for domain: ${system_domain}`,
    )
  if (!site_enabled)
    throw new Error(
      `r3ply has been disabled at the site-level config for domain: ${site_domain}`,
    )
}
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('r3ply_is_disabled', () => {
    expect(() => r3ply_is_disabled(false, 'system', true, 'site')).toThrowError(
      /disabled .*? system/,
    )
    expect(() =>
      r3ply_is_disabled(false, 'system', false, 'site'),
    ).toThrowError(/disabled .*? system/)
    expect(() =>
      r3ply_is_disabled(true, 'system', true, 'site'),
    ).not.toThrowError()
    expect(() => r3ply_is_disabled(true, 'system', false, 'site')).toThrowError(
      /disabled .*? site/,
    )
  })
}

function system_accepts_comments_for_site(
  site_domain: string,
  accepted_site_list: string[],
) {
  const matches = micromatch([site_domain], accepted_site_list)
  if (matches.length == 0)
    throw new Error(
      `System's site list '${JSON.stringify(accepted_site_list)}' does not accept comments for '${site_domain}'`,
    )
}

function site_accepts_comments_from_system(
  site_r3ply_list: string[],
  system_domain: string,
) {
  const matches = micromatch([system_domain], site_r3ply_list)
  if (matches.length == 0)
    throw new Error(
      `Site's r3ply list '${JSON.stringify(site_r3ply_list)}' does not accept comments from '${system_domain}`,
    )
}

function email_size_exceeds_max(input_size: number, max_allowed: number) {
  if (input_size < 0)
    throw new Error('Email input size (bytes) must be non-negative')
  if (max_allowed < 0)
    throw new Error('Max allowed email size (bytes) must be non-negative')
  if (input_size > max_allowed)
    throw new Error(`Email exceeded max of: ${max_allowed} bytes`)
}
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('email_size_exceeds_max', () => {
    expect(() => email_size_exceeds_max(-1, 123)).toThrowError(
      /Email input .*? must be non-negative/,
    )
    expect(() => email_size_exceeds_max(456, -1)).toThrowError(
      /Max allowed .*? must be non-negative/,
    )
    expect(() => email_size_exceeds_max(456, 123)).toThrowError(
      /Email exceeded max .*? bytes/,
    )
    expect(() => email_size_exceeds_max(123, 456)).not.toThrowError()
  })
}
