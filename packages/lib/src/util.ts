import crypto from 'crypto' // DON'T REMOVE!

export namespace config {
  /**
   * A function to perform the actual dereferencing of a file.
   *
   * @param base_uri the base_uri
   * @param file_uri_ref the file reference
   *
   * @returns the contents of the file or undefined. If `file_uri_ref` is undefined then it should return undefined.
   */
  export type DerferenceFile = (
    base_uri: string,
    file_uri_ref?: string,
  ) => Promise<string | undefined>

  /**
   * A helper function for resolving references in r3ply config keys, relative to the config's URI.
   *
   * @param config the underlying config to use.
   * @param base_uri the base URI relative to the references in the config.
   * @param dereference a function for performing the dereferencing (this function should ensure references are relative to the config)
   *
   * @returns a new config of the same type with all the file references being replaced with underlying referenced file's contents.
   */
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
  namespace resolve_config_reference {
    if (import.meta.vitest) {
      const { test, expect } = import.meta.vitest
      test('resolve_config_reference', async () => {
        let count = 1
        let config = {
          a: 'CHANGE ME',
          '&a': 'foo',
          b: { '&cat': 'cat', ca: 'bar', cat2: 'dog' },
        }
        const resolved = await resolve_references(
          config,
          '',
          async (uri, ref) => (count++).toString(),
        )
        expect(resolved).toStrictEqual({
          a: '1',
          '&a': 'foo',
          b: { '&cat': 'cat', ca: 'bar', cat2: 'dog', cat: '2' },
        })
      })
    }
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
