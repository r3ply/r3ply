import { tera } from '@r3ply/wasm'
import {
  bypass_moderation,
  can_moderate,
  ModerationChannel,
  ModerationRequest,
  ModerationResponse,
} from '.'
import { CommentTemplateContext } from '../comments/process'
import {
  comments,
  moderation,
  R3plySignetConfig,
  R3plySiteConfig,
} from '@r3ply/schema'
import { DecryptEmail, Encrypt } from '../comments/viaEmail/crypto'

export type LocalModerationArgs = {
  relative_path: string
  comment: string
}
export type LocalModerationResult = {
  absolute_path?: string
}
export type LocalModerationContext = {}

export interface LocalModeration<InCtx extends CommentTemplateContext>
  extends ModerationChannel<
    'local',
    InCtx,
    LocalModerationArgs,
    LocalModerationResult
  > {}

export type WriteLocalFile = (
  args: LocalModerationArgs,
) => Promise<string | undefined>

export function LocalModeration<InCtx extends CommentTemplateContext>(
  signet: R3plySignetConfig,
  comment_source: comments.R3plyCommentSource,
  write: WriteLocalFile,
  decrypt?: DecryptEmail,
): (
  config: moderation.R3plyLocalModerationConfig,
) => LocalModeration<InCtx> | undefined {
  return function (config: moderation.R3plyLocalModerationConfig) {
    if (can_moderate(signet, comment_source, config)) {
      const local_moderation: LocalModeration<InCtx> = {
        type: 'local',
        config,
        process: async function (
          comment: string,
          context: InCtx,
        ): Promise<ModerationRequest<LocalModerationArgs>> {
          return bypass_moderation(
            context.author,
            config['allow*'],
            decrypt,
          ).then((bypass_moderation) => {
            const request: ModerationRequest<LocalModerationArgs> = {
              args: {
                relative_path: tera(config['file_path_{}'], context),
                comment,
              },
              allow: bypass_moderation,
            }
            return request
          })
        },
        send: async function <R>(
          req: ModerationRequest<LocalModerationArgs>,
        ): Promise<ModerationResponse<LocalModerationResult>> {
          return write(req.args).then((response) => {
            const result: ModerationResponse<LocalModerationResult> = {
              result: {
                absolute_path: response,
              },
            }
            return result
          })
        },
      }
      return local_moderation
    } else {
      return undefined
    }
  }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('Local', async () => {
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
    const write = async (args: LocalModerationArgs) => {
      return '/Users/foo/Developer/website' + args.relative_path
    }
    expect(LocalModeration(site, 'email', write)(local_config)).toBeDefined()
    const local_mod = LocalModeration(site, 'email', write)(local_config)!
    const key = '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
    const url = new URL('https://example.com/blog/post/1')
    const local_context = {
      r3ply: {
        config_version: '0.0.1',
        server: 'r3ply.com',
        site: 'example.com',
        signet: 'a'.repeat(22),
        issued: '2025--0-19',
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
    const local_args = await local_mod.process(
      'this is a comment',
      local_context,
    )
    const response = await local_mod.send(local_args)
    expect(response.result.absolute_path).toBe(
      '/Users/foo/Developer/websitecontent/comments/123.txt',
    )
  })
}
