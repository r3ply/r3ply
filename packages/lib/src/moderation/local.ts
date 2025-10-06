import { tera } from '@r3ply/wasm'
import {
  ModerationChannel,
  ModerationChannelHandler,
  ModerationRequest,
  ModerationTicket,
} from '.'
import { CommentTemplateContext } from '../comments/process'
import { R3plySiteConfig } from '@r3ply/schema/config'
import { R3plyLocalModerationConfig } from '@r3ply/schema/config/moderation'
import { Result } from 'oxide.ts'
import { Encrypt } from '../comments/viaEmail'

/**
 * Args that are sent along with a request for local moderation.
 */
export type LocalModerationArgs = {
  relative_path: string
  comment: string
}

/**
 * The context that's returned upon receiving a request for local moderation.
 */
export type LocalModerationCtx = {
  local: {
    absolute_path: string
  }
}

/**
 * A local moderation request.
 *
 * @see ModerationRequest
 */
export type LocalModerationRequest = ModerationRequest<
  'local',
  LocalModerationArgs,
  LocalModerationCtx,
  Error
>

/**
 * A ticket returned upon receiving a request for local moderation.
 *
 * @see ModerationTicket
 */
export type LocalModerationTicket = ModerationTicket<
  'local',
  LocalModerationCtx,
  Error
>

/**
 * A function abstracts away the writing of a string to a file.
 */
export type WriteLocalFile = (args: LocalModerationArgs) => Promise<string>

/**
 * A Local moderation channel.
 */
export interface LocalModeration<InCtx extends CommentTemplateContext>
  extends ModerationChannel<
    'local',
    InCtx,
    LocalModerationArgs,
    LocalModerationCtx,
    Error
  > {}

/**
 * A local moderation channel handler.
 */
export interface LocalModerationHandler<InCtx extends CommentTemplateContext>
  extends ModerationChannelHandler<
    'local',
    InCtx,
    LocalModerationArgs,
    LocalModerationCtx,
    Error
  > {}

/**
 * A convenience function for creating an instance of a local moderator.
 *
 * @param file_writer The underlying implementation for performing the write to file.
 *
 * @returns A local moderation channel.
 */
export function LocalModeration<InCtx extends CommentTemplateContext>(
  file_writer: WriteLocalFile,
): LocalModeration<InCtx> {
  const result: LocalModeration<InCtx> = {
    type: 'local',
    handler: function (
      config: R3plyLocalModerationConfig,
    ): ModerationChannelHandler<
      'local',
      InCtx,
      LocalModerationArgs,
      LocalModerationCtx,
      Error
    > {
      return mk_local_mod_handler(file_writer, config)
    },
  }
  return result
}

/**
 * Internal implementation for creating a local moderation channel handler.
 *
 * @param file_writer The underlying implementation for performing the write to file.
 * @param config The config the local moderation handler will use to do its work.
 *
 * @returns A Local moderation channel handler.
 */
function mk_local_mod_handler<InCtx extends CommentTemplateContext>(
  file_writer: WriteLocalFile,
  config: R3plyLocalModerationConfig,
): LocalModerationHandler<InCtx> {
  const result: LocalModerationHandler<InCtx> = {
    type: 'local',
    config,
    prepare: function (
      comment: string,
      context: InCtx,
      bypass: boolean,
    ): LocalModerationRequest {
      const request: LocalModerationRequest = {
        type: 'local',
        args: {
          relative_path: tera(config['file_path_{}'], context),
          comment,
        },
        bypass,
        send: function (): Promise<LocalModerationTicket> {
          return Result.safe(file_writer(this.args))
            .then((result) =>
              result.map((s) => ({ local: { absolute_path: s } })),
            )
            .then((details) => ({ details, type: 'local' }))
        },
      }
      return request
    },
  }

  return result
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('Local moderation', async () => {
    const config = R3plySiteConfig({
      moderation: {
        local: [
          {
            'file_path_{}': 'content/comments/{{ comment.id[:8] }}.txt',
          },
        ],
      },
    }).value!
    const site = config.site[0]
    const local_config = config.moderation!.local[0]
    const local_channel = LocalModeration(async (args: LocalModerationArgs) => {
      return '/Users/foo/Developer/website' + args.relative_path
    })
    const local_handler = local_channel.handler(local_config)
    const key = '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
    const url = new URL('https://example.com/blog/post/1')
    const local_context = {
      r3ply: {
        config_version: '0.0.1',
        server: 'r3ply.com',
        site: 'example.com',
        signet: 'a'.repeat(22),
        issued: '2025-09-19',
      },
      author: {
        pseudonym: 'foo bar',
        token: await Encrypt.email(key)('bob@example.com'),
      },
      comment: {
        id: '123',
        ts_rcvd: '456',
        subject: { ...url, url: url.toString(), path: url.pathname },
        txt: 'Hello, world',
        md: undefined,
        html: undefined,
      },
    }
    const local_mod_req = await local_handler.prepare(
      'this is a comment',
      local_context,
      false,
    )
    const response = await local_mod_req.send()
    expect(response.type).toBe('local')
    expect(response.details.isOk()).toBe(true)
    expect(response.details.unwrap().local.absolute_path).toBe(
      '/Users/foo/Developer/websitecontent/comments/123.txt',
    )
  })
}
