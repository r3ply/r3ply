import {
  R3plyCommentsConfig,
  R3plyCommentSource,
  R3plyLocalModerationConfig,
  R3plyModerationChannelType,
  R3plyModerationChannelConfig,
  R3plyModerationConfig,
  R3plyModerationOptions,
  R3plySignetConfig,
} from '@r3ply/config'
import { CommentTemplateContext } from '../process'
import { LocalModeration } from './local'
import micromatch from 'micromatch'
import { Decrypt, DecryptEmail, Encrypt } from '../viaEmail/crypto'
import { Result } from 'oxide.ts'
import { EmailTemplateContext } from '../viaEmail/prepare'

export interface ModerationRequest<A> {
  args: A
  allow: boolean
}
export interface ModerationResult<R> {
  result: R
}
/**
 * Moderation channels handle what is supposed to happen to a comment after it's been made.
 *
 * For example, comments may be sent to a GitHub repo as a pull request, or saved as a file locally.
 *
 * For moderation, templating is often necessary, so there is a separate but similar process to the comment pipeline. Template contexts are formed by a `prepare` command, then templates are bound to those contexts with a `process` command – thus creating the arguments that will be sent to moderation – and finally the results are sent for moderation as arguments, using the `send` command.
 */
export interface ModerationChannel<
  T extends R3plyModerationChannelType,
  Conf extends R3plyModerationChannelConfig & R3plyModerationConfig[T][number],
  InCtx extends CommentTemplateContext,
  OutCtx,
  Args,
  Rep,
> {
  type: T
  config: Conf
  /**
   * Produce a new template context that's specific to the moderation channel
   * @param config Any implementation of `ModerationChannel` should know how to handle `R3plyModerationConfig`
   * @param context The initial context, e.g. `CommentTemplateContext & EmailTemplateContext`
   * @returns The context used when binding any templates that will be sent as a part of moderation
   */
  prepare: (context: InCtx) => Promise<OutCtx & InCtx>

  /**
   * Produce arguments by binding any template contexts with the comment or values from the config
   * @param comment the comment as a string
   * @param context variables that will be available to templating
   * @returns Arguments that will be sent for moderation
   */
  process: (
    comment: string,
    context: OutCtx & InCtx,
  ) => Promise<ModerationRequest<Args>>

  /**
   * Send a request to the extending moderation channel
   * @param req A moderation request
   * @returns The initial response from that moderation channel
   */
  send: <R>(req: ModerationRequest<Args>) => Promise<ModerationResult<Rep>>
}

interface ModerationImplementations<InCtx extends CommentTemplateContext> {
  github?: any // TODO
  webhook?: any // TODO
  local?: () => LocalModeration<InCtx>
}

/**
 * Perform the tasks of moderation
 * @param site the signet config of a comment recipient, to be filtered by label per `filter*` config
 * @param config
 * @param commenting_channel
 * @param moderation_channels
 * @param comment
 * @param context
 */
export function handel_moderation<
  Ctx extends CommentTemplateContext,
  Channels extends Record<string, ModerationChannel<Ctx, any, any, any>>[],
>(
  site: R3plySignetConfig,
  config: R3plyModerationConfig,
  commenting_channel: R3plyCommentSource,
  moderation_channels: ModerationImplementations<Ctx>,
  comment: string,
  context: Ctx,
) {
  /**
   * General algorithm will be:
   * for each implementation I:
   *  filter each configured channel Cf corresponding to I:
   *    construct a ModerationChannel C using I + Cf
   *    call `prepare` on C, passing in comment and upstream comment context, receiving moderation context MCtx
   *    call `process` on C, passing in MCtx, receiving a request object MReq
   *    call `send` on C, passing in MReq, receiving a response object MRep
   */
  const local_mod_channels = config.local
    .filter((l) => can_moderate(l, commenting_channel, site))
    .map((config) => LocalModeration(config))
}

export function can_moderate(
  site: R3plySignetConfig,
  comment_source: R3plyCommentSource,
  opts: R3plyModerationOptions,
): boolean {
  // Check if moderation is enabled for this moderation channel
  if (opts.enabled) {
    // Check if this commenting source is either disabled or accepted by this moderation channel
    if (!opts.comments || opts.comments.includes(comment_source)) {
      // Check if filtering by site is either disabled or the site's label matches the filter
      if (
        !opts['filter*'] ||
        (site.label && micromatch([site.label], opts['filter*']).length > 0)
      ) {
        return true
      }
    }
  }
  // If all of the above checks don't happen, then moderation does not occur
  return false
}

export async function bypass_moderation(
  author: CommentTemplateContext['author'],
  allow_glob: string[],
  decrypt?: DecryptEmail,
): Promise<boolean> {
  if (decrypt) {
    const result = Result.safe(
      decrypt(author.token).then((email) => {
        return micromatch([author.pseudonym, email], allow_glob).length > 0
      }),
    )
    return result.then((result) => {
      if (result.isErr()) {
        console.error(
          `An error occurred while checking if author with pseudonym "${author.pseudonym}" should bypass moderation. Since nothing can be done about this without further investigation, defaulting to sending for moderation`,
        )
        return false
      } else {
        return result.unwrap()
      }
    })
  } else {
    return micromatch([author.pseudonym], allow_glob).length > 0
  }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  // prettier-ignore
  test('can moderate', async () => {
    const mod_options: R3plyModerationOptions = {
      enabled: true,
      'allow*': [],
    }
    const site: R3plySignetConfig = {
      domain: 'example.com',
      r3ply: 'r3ply.com',
      signet: 'a'.repeat(22),
      issued: '2025-09-19',
      label: 'test'
    }
    // disabled always prevents moderation
    expect(can_moderate(site, 'email', { ...mod_options, enabled: false })).toBe(false)
    // enabled, with no comment source or filtering defined
    expect(can_moderate(site, 'email', mod_options)).toBe(true)
    // no matching comment sources
    expect(can_moderate(site, 'email', { ...mod_options, comments: [] })).toBe(false)
    // matching comment sources
    expect(can_moderate(site, 'email', { ...mod_options, comments: ['email'] })).toBe(true)
    // no matching site label
    expect(can_moderate(site, 'email', { ...mod_options, "filter*": [] })).toBe(false)
    // matching site label
    expect(can_moderate(site, 'email', { ...mod_options, "filter*": ['test'] })).toBe(true)
    // match all defined site labels
    expect(can_moderate(site, 'email', { ...mod_options, "filter*": ['*'] })).toBe(true)
    expect(can_moderate({ ...site, label: "test2" }, 'email', { ...mod_options, "filter*": ['*'] })).toBe(true)
    expect(can_moderate({ ...site, label: undefined }, 'email', { ...mod_options, "filter*": ['*'] })).toBe(false)
    // allow any defined site, but filter out one case
    expect(can_moderate({ ...site, label: "evil" }, 'email', { ...mod_options, "filter*": ['*', '!evil'] })).toBe(false)
    expect(can_moderate({ ...site, label: "good" }, 'email', { ...mod_options, "filter*": ['*', '!evil'] })).toBe(true)
  })
  // prettier-ignore
  test('bypass moderation', async () => {
    const key = '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
    const author: CommentTemplateContext['author'] = {
      pseudonym: 'foo bar',
      token: await Encrypt.email(key)('bob@example.com')
    }
    // empty allow list
    expect(await bypass_moderation(author, [], Decrypt.email(key))).toBe(false)
    // plaintext email + decrypter
    expect(await bypass_moderation(author, ['bob@example.com'], Decrypt.email(key))).toBe(true)
    // wrong plaintext email + decrypter
    expect(await bypass_moderation(author, ['alice@example.com'], Decrypt.email(key))).toBe(false)
    // plaintext email + no decrypter
    expect(await bypass_moderation(author, ['bob@example.com'])).toBe(false)
    // matching pseudonym
    expect(await bypass_moderation(author, ['foo bar'])).toBe(true)
    // non-matching pseudonym
    expect(await bypass_moderation(author, ['foo'])).toBe(false)
    // match any non-empty string
    expect(await bypass_moderation(author, ['*'])).toBe(true)
    // non-matching glob
    expect(await bypass_moderation(author, ['*baz'])).toBe(false)
    // matching glob
    expect(await bypass_moderation(author, ['foo*'])).toBe(true)
  })
}
