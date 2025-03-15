import path from 'path'
import fs from 'fs'
import { Result } from 'oxide.ts'

export namespace util {
  export async function find_up(
    filename: string,
    cwd: string = process.cwd(),
  ): Promise<string | undefined> {
    let currentDir = cwd

    do {
      const file_path = path.join(currentDir, filename)
      // Awaiting is fine here because fs.promises.access is inherently non-blocking
      const result = await Result.safe(fs.promises.access(file_path))
      if (result.isOk()) return file_path
      currentDir = path.dirname(currentDir)
    } while (currentDir !== path.dirname(currentDir))

    return undefined
  }

  export function unsafeUnwrap<T, E = Error>(result: Result<T, E>): T {
    return result.unwrapOrElse(() => {
      throw result.unwrapErr()
    })
  }

  export function random_int(ceiling: number, floor: number = 0) {
    return Math.floor(Math.random() * (ceiling - floor)) + floor
  }

  export async function sha256_0x(str: string) {
    const encoded = new TextEncoder().encode(str)
    return crypto.subtle
      .digest({ name: 'SHA-256' }, encoded)
      .then((hashed_buffer) => {
        const hashArray = new Uint8Array(hashed_buffer)
        const hashHex = Array.prototype.map
          .call(hashArray, (byte: number) => {
            return ('00' + byte.toString(16)).slice(-2)
          })
          .join('')
        return hashHex
      })
  }
}
