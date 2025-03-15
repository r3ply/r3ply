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
}

/**
 * Use this to curry dependencies.
 * e.g. with `OmitFirstParameter<typeof update_gist>` then:
 * `update_gist(gist_token: string, gist_id: string, files: GistFiles)`
 * becomes...
 * `update_gist(gist_id: string, files: GistFiles)`
 */
export type OmitFirstParameter<T extends (...args: any) => any> = T extends (
  arg1: any,
  ...rest: infer P
) => infer R
  ? (...args: P) => R
  : never
