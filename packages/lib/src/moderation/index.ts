import { R3plySignetConfig } from '@r3ply/schema/config'
import { R3plyCommentSource } from '@r3ply/schema/config/comments'
import {
  R3plyModerationChannelType,
  R3plyModerationConfig,
  R3plyModerationOptions,
} from '@r3ply/schema/config/moderation'
import { CommentTemplateContext } from '../comments/process'
import micromatch from 'micromatch'
import { Decrypt, DecryptEmail, Encrypt } from '../comments/viaEmail/token'
import { Result } from 'oxide.ts'

export * from './local'
export * from './github'

// TODO: in the future this work needs to be refactored to lean more on a discriminated union approach to the types, using the `type` field + moderation.R3plyModerationChannelType

export type ModerationChannelType = R3plyModerationChannelType
export type ModerationChannelConfig<T extends ModerationChannelType> =
  R3plyModerationConfig[T][number]

/**
 * A moderation channel. This interface encapsulates the underlying implementation for a moderation channel.
 *
 * To prepare a moderation request, you will first need a `ModerationChannelHandler` which is a moderation channel + a site's `signet`, a commenting src (e.g. 'email'), and a configuration of that handler.
 *
 * @see ModerationChannelHandler
 * @see signet
 * @see ModerationChannelConfig
 */
export interface ModerationChannel<
  T extends ModerationChannelType,
  InCtx,
  Args,
  OutCtx,
  Fail,
> {
  type: T
  handler: (
    config: ModerationChannelConfig<T>,
  ) => ModerationChannelHandler<T, InCtx, Args, OutCtx, Fail>
}

/**
 * A simple type alias used to represent a generic moderation channel with a known InCtx.
 */
export type AnyModerationChannel<InCtx> = {
  // intentionally no generics on Args/OutCtx/Fail
  type: ModerationChannelType
  handler: (
    signet: R3plySignetConfig,
    src: R3plyCommentSource,
    config: ModerationChannelConfig<ModerationChannelType>,
  ) => ModerationChannelHandler<ModerationChannelType, InCtx, any, any, any>
}

/**
 * A handler for preparing moderation requests.
 */
export interface ModerationChannelHandler<
  T extends R3plyModerationChannelType,
  InCtx,
  Args,
  OutCtx,
  Fail,
> {
  type: T
  config: ModerationChannelConfig<T>
  prepare: (
    comment: string,
    context: InCtx,
    bypass: boolean,
  ) => ModerationRequest<T, Args, OutCtx, Fail>
}

/**
 * A request for moderation. After preparing a request you may send it for moderation.
 *
 * @see ModerationTicket
 */
export interface ModerationRequest<
  T extends ModerationChannelType,
  A,
  OutCtx,
  F,
> {
  type: T
  args: A
  bypass: boolean
  send: () => Promise<ModerationTicket<T, OutCtx, F>>
}

/**
 * Receipt of a request for moderation along with the relevant details.
 *
 * @see ModerationRequest
 */
export interface ModerationTicket<T extends ModerationChannelType, Ok, Err> {
  type: T
  details: Result<Ok, Err>
}

/**
 * A collection of functions that are useful for handling different stages of the moderation pipeline.
 */
export namespace Moderation {
  // TODO: this function centralizes the logic for how moderation channels should be filtered and then how the subsequent filtered handlers should prepare requests but there was an issue with the types being erased so I'm just doing the same logic in viaEmail for now.
  // export async function prepare<
  //   T extends ModerationChannelType,
  //   InCtx extends CommentTemplateContext,
  //   Args,
  //   OutCtx,
  //   Fail,
  // >(
  //   signet: R3plySignetConfig,
  //   src: comments.R3plyCommentSource,
  //   config: ModerationChannelConfig<T>,
  //   bypass_opts: {
  //     cleartext?: string
  //     decrypt?: DecryptEmail
  //   },
  //   comment: string,
  //   context: InCtx,
  //   channel: ModerationChannel<T, InCtx, Args, OutCtx, Fail>,
  // ): Promise<Result<ModerationRequest<T, Args, OutCtx, Fail>, Error>> {
  //   const can_moderate_result = can_moderate(signet, src, config)
  //   if (can_moderate_result.isOk()) {
  //     const channel_handler = channel.handler(config)
  //     return Result.safe(
  //       can_bypass(context.author, config['allow*'], bypass_opts).then(
  //         (bypass) => channel_handler.prepare(comment, context, bypass),
  //       ),
  //     )
  //   } else {
  //     return Promise.resolve(Err(can_moderate_result.unwrapErr()))
  //   }
  // }

  /**
   * Ask if a moderation channel can moderate a comment for a particular moderation configuration.
   *
   * @param site The site (i.e. signet) the comment is addressed to.
   * @param comment_source The source of the comment (e.g. 'email').
   * @param opts The options that are in each moderation config that configure the rules of whether it can perform some moderation or not.
   *
   * @returns A Result type of void if successful or an error explaining why.
   */
  export function can_moderate(
    site: R3plySignetConfig,
    comment_source: R3plyCommentSource,
    opts: R3plyModerationOptions,
  ): Result<void, Error> {
    return Result.safe(() => {
      // Check if moderation is enabled for this moderation channel
      if (opts.enabled) {
        // Check if this commenting source is either disabled or accepted by this moderation channel
        if (!opts.comments || opts.comments.includes(comment_source)) {
          // Check if filtering by site is either disabled or the site's label matches the filter
          if (
            !opts['filter*'] ||
            (site.label && micromatch([site.label], opts['filter*']).length > 0)
          ) {
            return
          } else {
            throw new Error(
              `site label '${site.label ?? 'undefined'}' did not match moderation channel configuration '${JSON.stringify(opts['filter*'])}'`,
            )
          }
        } else {
          throw new Error(
            `comment source '${comment_source}' not accepted by moderation channel configuration '${JSON.stringify(opts.comments)}'`,
          )
        }
      } else {
        throw new Error('moderation disabled for channel')
      }
    })
  }
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest

    // prettier-ignore
    describe('can_moderate', async () => {
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
    const can_moderate = Moderation.can_moderate
    can_moderate(site, 'email', mod_options).orElse(err => {
      console.assert(false, "Tests can not run without correct default options.")
      throw err
    })
    test("A moderation config that's disabled can never be moderated", () => {
      const [err] = can_moderate(site, 'email', { ...mod_options, enabled: false }).intoTuple()
      expect(err?.message).toMatch(/moderation disabled for channel/)
    })
    test("A moderation config that's enabled, with no comment source or filtering defined, can be moderated", () => {
      expect(can_moderate(site, 'email', mod_options).isOk()).toBe(true)
    })
    test("A moderation config with non-matching comment sources can not be moderated", () => {
      const [err] = can_moderate(site, 'email', { ...mod_options, comments: [] }).intoTuple()
      expect(err?.message).toMatch(/comment source 'email' not accepted by moderation channel configuration '\[\]'/)
    })
    test("A moderation config with matching sources can be moderated", () => {
      expect(can_moderate(site, 'email', { ...mod_options, comments: ['email'] }).isOk()).toBe(true)
    })
    test("A moderation config with no matching site label can not be moderated", () => {
      const [err] = can_moderate(site, 'email', { ...mod_options, "filter*": [] }).intoTuple()
      expect(err?.message).toMatch(/site label 'test' did not match moderation channel configuration '\[\]'/)
    })
    test("A moderation config matching any labels can be moderated", () => {
      expect(can_moderate(site, 'email', { ...mod_options, "filter*": ['*'] }).isOk()).toBe(true)
      expect(can_moderate({ ...site, label: "test2" }, 'email', { ...mod_options, "filter*": ['*'] }).isOk()).toBe(true)
    })
    test("A moderation config matching any labels must not be moderated if the label is undefined", () => {
      const [err] = can_moderate({ ...site, label: undefined }, 'email', { ...mod_options, "filter*": ['*'] }).intoTuple()
      expect(err?.message).toMatch(/site label 'undefined' did not match moderation channel configuration '\[\"\*\"\]'/)
    })
    test("A moderation config may allow any site by label except one", () => {
      expect(can_moderate({ ...site, label: "good" }, 'email', { ...mod_options, "filter*": ['*', '!evil'] }).isOk()).toBe(true)
      const [err] = can_moderate({ ...site, label: "evil" }, 'email', { ...mod_options, "filter*": ['*', '!evil'] }).intoTuple()
      expect(err?.message).toMatch(/site label 'evil' did not match moderation channel configuration '\[\"\*\",\"!evil\"\]'/)
    })
  })
  }

  /**
   * Checks if a comment can bypass moderation according to the site's configuration.
   *
   * @param config The configuration for this moderation channel.
   * @param context The comment context. It will contain necessary details such as authorship.
   * @param bypass_opts Additional options that can be used for filtering, such as a cleartext version of the comment author's email, or a function that can be used to decrypt it.
   *
   * @returns A promise of a boolean.
   */
  export async function bypass<
    T extends ModerationChannelType,
    InCtx extends CommentTemplateContext,
  >(
    config: ModerationChannelConfig<T>,
    context: InCtx,
    bypass_opts: {
      cleartext?: string
      decrypt?: DecryptEmail
    },
  ): Promise<boolean> {
    return can_bypass(context.author, config['allow*'], bypass_opts)
  }
}

/**
 * Internal implementation of the logic for whether a comment can bypass moderation or not.
 *
 * @param author The authorship details of the comment.
 * @param allow_glob An array of glob patterns that specify the authors that are allowed to bypass moderation.
 * @param options Additional options that can be taken into consideration for determining whether to bypass moderation.
 *
 * @returns A promise of a boolean.
 */
async function can_bypass(
  author: CommentTemplateContext['author'],
  allow_glob: string[],
  options: {
    cleartext?: string
    decrypt?: DecryptEmail
  } = {},
): Promise<boolean> {
  if (options.cleartext) {
    return (
      micromatch([author.pseudonym, options.cleartext], allow_glob).length > 0
    )
  } else if (options.decrypt) {
    const result = Result.safe(
      options.decrypt(author.token).then((email) => {
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
  test('bypass moderation', async () => {
    const author: CommentTemplateContext['author'] = {
      pseudonym: 'foo bar',
      token: await Encrypt.email(key)('bob@example.com')
    }
    // empty allow list
    expect(await can_bypass(author, [], { decrypt: Decrypt.email(key) })).toBe(false)
    // cleartext email + decrypt option
    expect(await can_bypass(author, ['bob@example.com'], { decrypt: Decrypt.email(key) })).toBe(true)
    // cleartext email + cleartext option
    expect(await can_bypass(author, ['bob@example.com'], { cleartext: 'bob@example.com' })).toBe(true)
    // wrong cleartext email + decrypt option
    expect(await can_bypass(author, ['alice@example.com'], { decrypt: Decrypt.email(key) })).toBe(false)
    // wrong cleartext email + cleartext option
    expect(await can_bypass(author, ['alice@example.com'], { cleartext: 'bob@example.com' })).toBe(false)
    // cleartext email + no decrypt option
    expect(await can_bypass(author, ['bob@example.com'])).toBe(false)
    // matching pseudonym
    expect(await can_bypass(author, ['foo bar'])).toBe(true)
    // non-matching pseudonym
    expect(await can_bypass(author, ['foo'])).toBe(false)
    // match any non-empty string
    expect(await can_bypass(author, ['*'])).toBe(true)
    // non-matching glob
    expect(await can_bypass(author, ['*baz'])).toBe(false)
    // matching glob
    expect(await can_bypass(author, ['foo*'])).toBe(true)
  })
}
