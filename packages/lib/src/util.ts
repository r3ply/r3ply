import crypto from 'crypto' // DON'T REMOVE!

export namespace config {
  export type DerferenceFile = (
    base_uri: string,
    file_uri_ref?: string,
  ) => Promise<string | undefined>
  export async function resolve_references<T>(
    config: T,
    base_uri: string,
    dereference: DerferenceFile,
  ): Promise<T> {
    async function resolveObject(
      obj: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      let result: Record<string, unknown> = { ...obj }

      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Recurse into nested objects
          result[key] = await resolveObject(value as Record<string, unknown>)
        }

        if (key.startsWith('&')) {
          const normalKey = key.slice(1)
          const strValue = obj[normalKey]
          const uriValue = typeof value === 'string' ? value : undefined

          result[normalKey] = await resolve_config_reference(
            base_uri,
            dereference,
            {
              str: typeof strValue === 'string' ? strValue : undefined,
              uri: uriValue,
            },
          )
        }
      }

      return result
    }

    return (await resolveObject(
      config as unknown as Record<string, unknown>,
    )) as T
  }
  async function resolve_config_reference(
    base_uri: string,
    dereference: DerferenceFile,
    template: { str?: string; uri?: string },
  ) {
    if (template.uri) return dereference(base_uri, template.uri)
    else return template.str
  }
  if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest
    test('resolve config references 2', async () => {
      let count = 1
      let config = {
        a: 'CHANGE ME',
        '&a': 'foo',
        b: { '&cat': 'cat', ca: 'bar', cat2: 'dog' },
      }
      const resolved = await resolve_references(config, '', async (uri, ref) =>
        (count++).toString(),
      )
      expect(resolved).toStrictEqual({
        a: '1',
        '&a': 'foo',
        b: { '&cat': 'cat', ca: 'bar', cat2: 'dog', cat: '2' },
      })
    })
  }
}

export function bufferToHex(buffer: ArrayBuffer): string {
  const view = new DataView(buffer)
  let hex = ''
  for (let i = 0; i < view.byteLength; i++) {
    hex += view.getUint8(i).toString(16).padStart(2, '0')
  }
  return hex
}
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
export function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
export function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4
  if (pad) str += '='.repeat(4 - pad)
  const binary = atob(str)
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)))
}

// TODO: uncomment
// TESTS
// if (import.meta.vitest) {
//   const { it, expect } = import.meta.vitest
//   it('resolves remote references to templates', async () => {
//     const parsed_config = siteConfigParser(
//       JSON.stringify({
//         version: '0.0.1',
//         site: [
//           {
//             domain: 'spenc.es',
//             r3ply: 'r3ply.com',
//             signet: 'qhQ6YSUvQNLb1lCdw3kDRg',
//             issued: '2025-08-22',
//           },
//         ],
//         comments: {
//           email: {
//             enabled: false,
//             moderation: {
//               type: 'github',
//               repo: 'https://github.com/example/your-repo',
//               'file_path_{}': '{{ comment.id }}.txt',
//               '&commit_msg_{}': '/commit/msg.txt',
//               '&pr_body_{}': '../pr/body.txt',
//             },
//             '&comment_{}': '/comment/template/path.txt',
//             'comment_{}_mime': '',
//             notify: {
//               '&comment_received_notif_{}': '/comment/received.txt',
//               '&comment_submitted_notif_{}': '/comment/submitted.txt',
//             },
//           },
//         },
//         enabled: false,
//       }),
//     )

//     const config: R3plySiteConfig = parsed_config.value!
//     const dereference: DerferenceFile = async (_, file_uri_ref?: string) => {
//       if (file_uri_ref) return `File Contents of '${file_uri_ref}'`
//       else return undefined
//     }
//     const resolved_config = await resolve_config_references(
//       config,
//       'https://example.com',
//       dereference,
//     )
//     expect(resolved_config.comments.email['comment_{}']).toBe(
//       "File Contents of '/comment/template/path.txt'",
//     )
//     expect(
//       resolved_config.comments.email.notify['comment_received_notif_{}'],
//     ).toBe("File Contents of '/comment/received.txt'")
//     expect(
//       resolved_config.comments.email.notify['comment_submitted_notif_{}'],
//     ).toBe("File Contents of '/comment/submitted.txt'")
//     expect(resolved_config.comments.email.moderation.type).toBe('github')
//     if (resolved_config.comments.email.moderation.type == 'github') {
//       expect(resolved_config.comments.email.moderation['commit_msg_{}']).toBe(
//         "File Contents of '/commit/msg.txt'",
//       )
//       expect(resolved_config.comments.email.moderation['pr_body_{}']).toBe(
//         "File Contents of '../pr/body.txt'",
//       )
//     }
//   })
// }
