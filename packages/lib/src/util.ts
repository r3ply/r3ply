import crypto from 'crypto'
import { R3plySiteConfig, siteConfigParser } from '@r3ply/config'

export type DerferenceFile = (
  base_uri: string,
  file_uri_ref?: string,
) => Promise<string | undefined>

export async function resolve_config_references(
  config: R3plySiteConfig,
  base_uri: string,
  dereference: DerferenceFile,
): Promise<R3plySiteConfig> {
  // resolve main config references
  return Promise.all([
    resolve_config_reference(base_uri, dereference, {
      str: config.comments.email.notify['comment_received_notif_{}'],
      uri: config.comments.email.notify['&comment_received_notif_{}'],
    }),
    resolve_config_reference(base_uri, dereference, {
      str: config.comments.email.notify['comment_submitted_notif_{}'],
      uri: config.comments.email.notify['&comment_submitted_notif_{}'],
    }),
    resolve_config_reference(base_uri, dereference, {
      str: config.comments.email['comment_{}'],
      uri: config.comments.email['&comment_{}'],
    }),
  ])
    .then(([comment_received_notif, comment_submitted_notif, comment]) => {
      const updated_config: R3plySiteConfig = {
        ...config,
        comments: {
          ...config.comments,
          email: {
            ...config.comments.email,
            'comment_{}': comment,
            notify: {
              ...config.comments.email.notify,
              'comment_received_notif_{}': comment_received_notif,
              'comment_submitted_notif_{}': comment_submitted_notif,
            },
          },
        },
      }
      return updated_config
    })
    .then((config) => {
      if (config.comments.email.moderation.type == 'github') {
        return Promise.all([
          resolve_config_reference(base_uri, dereference, {
            str: config.comments.email.moderation['commit_msg_{}'],
            uri: config.comments.email.moderation['&commit_msg_{}'],
          }),
          resolve_config_reference(base_uri, dereference, {
            str: config.comments.email.moderation['pr_body_{}'],
            uri: config.comments.email.moderation['&pr_body_{}'],
          }),
        ]).then(([commit_msg, pr_body]) => {
          if (config.comments.email.moderation.type == 'github') {
            const updated_config: R3plySiteConfig = {
              ...config,
              comments: {
                ...config.comments,
                email: {
                  ...config.comments.email,
                  moderation: {
                    ...config.comments.email.moderation,
                    'commit_msg_{}': commit_msg!, // commit_msg_{} has a default
                    'pr_body_{}': pr_body!, // pr_body_{} has a default
                  },
                },
              },
            }
            return updated_config
          } else throw ''
        })
      } else return config
    })
}

async function resolve_config_reference(
  base_uri: string,
  dereference: DerferenceFile,
  template: { str?: string; uri?: string },
) {
  if (template.uri) return dereference(base_uri, template.uri)
  else return template.str
}

export function createHMAC(key: string) {
  return function (message: string) {
    return computeHMAC(key, message)
  }
}
export async function computeHMAC(
  key: string,
  message: string,
): Promise<string> {
  // Encode the key and message as Uint8Array
  const keyBytes = new TextEncoder().encode(key)
  const messageBytes = new TextEncoder().encode(message)
  // Import the key for HMAC signing
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  // Sign HMAC
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes)
  // Convert signature to hex string
  return bufferToHex(signature)
}
function bufferToHex(buffer: ArrayBuffer): string {
  const view = new DataView(buffer)
  let hex = ''
  for (let i = 0; i < view.byteLength; i++) {
    hex += view.getUint8(i).toString(16).padStart(2, '0')
  }
  return hex
}

// TESTS
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('computes HMAC from a key + message', async () => {
    let result = await computeHMAC('password123', 'hello, world!')
    expect(result).toBe(
      '429295d1b743487488fbac6012b5f857d18ee0f7fc4cc2bc016ab462fadbc663',
    )
  })
  it('creates HMAC from a key', async () => {
    let signHMAC = createHMAC('password123')
    expect(await signHMAC('hello, world!')).toBe(
      '429295d1b743487488fbac6012b5f857d18ee0f7fc4cc2bc016ab462fadbc663',
    )
  })

  it('resolves remote references to templates', async () => {
    const parsed_config = siteConfigParser(
      JSON.stringify({
        version: '0.0.1',
        domains: ['example.com'],
        r3ply: ['r3ply.com'],
        comments: {
          email: {
            enabled: false,
            moderation: {
              type: 'github',
              repo: 'https://github.com/example/your-repo',
              'file_path_{}': '{{ comment.id }}.txt',
              '&commit_msg_{}': '/commit/msg.txt',
              '&pr_body_{}': '../pr/body.txt',
            },
            '&comment_{}': '/comment/template/path.txt',
            'comment_{}_mime': '',
            notify: {
              '&comment_received_notif_{}': '/comment/received.txt',
              '&comment_submitted_notif_{}': '/comment/submitted.txt',
            },
          },
        },
        enabled: false,
      }),
    )

    const config: R3plySiteConfig = parsed_config.value!
    const dereference: DerferenceFile = async (_, file_uri_ref?: string) => {
      if (file_uri_ref) return `File Contents of '${file_uri_ref}'`
      else return undefined
    }
    const resolved_config = await resolve_config_references(
      config,
      'https://example.com',
      dereference,
    )
    expect(resolved_config.comments.email['comment_{}']).toBe(
      "File Contents of '/comment/template/path.txt'",
    )
    expect(
      resolved_config.comments.email.notify['comment_received_notif_{}'],
    ).toBe("File Contents of '/comment/received.txt'")
    expect(
      resolved_config.comments.email.notify['comment_submitted_notif_{}'],
    ).toBe("File Contents of '/comment/submitted.txt'")
    expect(resolved_config.comments.email.moderation.type).toBe('github')
    if (resolved_config.comments.email.moderation.type == 'github') {
      expect(resolved_config.comments.email.moderation['commit_msg_{}']).toBe(
        "File Contents of '/commit/msg.txt'",
      )
      expect(resolved_config.comments.email.moderation['pr_body_{}']).toBe(
        "File Contents of '../pr/body.txt'",
      )
    }
  })
}
