import { R3plySystemConfig } from '@r3ply/schema/config'
import { receive, process, email } from './comments'
import { CommentViaEmailSupportedModerationChannels } from './comments/viaEmail'

/**
 * The main interface for implementing r3ply.
 *
 * r3ply applications should handle IO themselves and implement the logic by wraping themselves around an instance of this interface.
 */
export interface R3ply {
  /**
   * Each of the comment sources is represented under `comments`, e.g. `viaEmail`.
   *
   * They work by accepting dependencies to form a handler of that comment source.
   *
   * A comment handler is a function that accepts a comment event and returns a response.
   *
   * @see CommentViaEmailSupportedModerationChannels
   */
  comments: {
    viaEmail: (
      anonymize_key: string,
      encrypt_key: string,
      pipeline: {
        prescreen?: typeof email.prescreen
        receive?: typeof receive
        accept?: typeof email.accept
        deliverable?: typeof email.deliverable
        prepare?: typeof email.prepare
        process?: typeof process
      },
      moderation_channels: CommentViaEmailSupportedModerationChannels[],
    ) => email.CommentViaEmailHandler
  }
}

/**
 * A helper function to construct an object that conforms to the `R3ply` interface.
 *
 * It's useful for creating instances of the R3ply, such as a server or CLI tool.
 *
 * @param system the underlying configuration of this r3ply instance
 * @returns a R3ply instance
 */
function mk_r3ply(system: R3plySystemConfig): R3ply {
  return {
    comments: {
      viaEmail: (
        anonymize_key: string,
        encrypt_key: string,
        pipeline: {
          prescreen?: typeof email.prescreen
          receive?: typeof receive
          accept?: typeof email.accept
          deliverable?: typeof email.deliverable
          prepare?: typeof email.prepare
          process?: typeof process
        } = {},
        moderation_channels: CommentViaEmailSupportedModerationChannels[] = [],
      ) =>
        email.CommentViaEmail(
          system,
          anonymize_key,
          encrypt_key,
          {
            ...pipeline,
          },
          moderation_channels,
        ),
    },
  }
}

export const R3ply = mk_r3ply
