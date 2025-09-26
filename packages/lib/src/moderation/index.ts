import { comments, moderation, R3plySignetConfig } from '@r3ply/schema'
import { CommentTemplateContext } from '../comments/process'
import { LocalModeration, WriteLocalFile } from './local'
import micromatch from 'micromatch'
import { Decrypt, DecryptEmail, Encrypt } from '../comments/viaEmail/crypto'
import { Result } from 'oxide.ts'
export * from './local'

export interface ModerationRequest<A> {
  args: A
  allow: boolean
}
export interface ModerationResponse<R> {
  result: R
}
/**
 * Moderation channels handle what happens after a request has been processed into a comment. It's a hand-off to the site.
 *
 * For example, comments may be sent to a GitHub repo as a pull request, or saved as a file locally.
 *
 * For moderation, templating is often necessary, so there is a similar process to the comment pipeline but simpler. Template contexts are formed by a `process` function – thus creating the arguments that will be sent to moderation – and then sent for moderation with the `send` command.
 */
export interface ModerationChannel<
  T extends moderation.R3plyModerationChannelType,
  InCtx extends CommentTemplateContext,
  Args,
  OutCtx,
> {
  type: T
  config: moderation.R3plyModerationChannelConfig &
    moderation.R3plyModerationConfig[T][number]

  /**
   * Produce arguments by binding any template contexts with the comment or values from the config
   * @param comment the comment as a string
   * @param context variables that will be available to templating
   * @returns Arguments that will be sent for moderation
   */
  process: (comment: string, context: InCtx) => Promise<ModerationRequest<Args>>

  /**
   * Send a request to the extending moderation channel
   * @param req A moderation request
   * @returns The initial response from that moderation channel
   */
  send: <R>(req: ModerationRequest<Args>) => Promise<ModerationResponse<OutCtx>>
}

export interface ModerationImplementations<
  InCtx extends CommentTemplateContext,
> {
  github?: any // TODO
  webhook?: any // TODO
  local?: (
    local_config: moderation.R3plyLocalModerationConfig,
  ) => LocalModeration<InCtx> | undefined
}
export function ModerationImplementations<InCtx extends CommentTemplateContext>(
  signet: R3plySignetConfig,
  comment_source: comments.R3plyCommentSource,
  decrypt?: DecryptEmail,
  write_local?: WriteLocalFile,
) {
  const result: ModerationImplementations<InCtx> = {
    local: write_local
      ? LocalModeration(signet, comment_source, write_local, decrypt)
      : undefined,
  }
  return result
}

export function can_moderate(
  site: R3plySignetConfig,
  comment_source: comments.R3plyCommentSource,
  opts: moderation.R3plyModerationOptions,
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
  const key = '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
  // prettier-ignore
  test('can moderate', async () => {
    const mod_options: moderation.R3plyModerationOptions = {
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
