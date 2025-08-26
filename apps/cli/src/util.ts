import path from 'path'
import fs from 'fs'
import { Result } from 'oxide.ts'
import crypto from 'crypto'

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

  /**
   * Unwraps a result or else it throws the underlying error
   * @param result
   * @returns
   */
  export function unsafeUnwrap<T, E = Error>(result: Result<T, E>): T {
    return result.unwrapOrElse(() => {
      throw result.unwrapErr()
    })
  }

  /**
   * chooses a number between ceiling and floor, suitable for picking random elements from an array
   * @param ceiling exclusive
   * @param floor inclusive
   * @returns
   */
  export function random_int(ceiling: number, floor: number = 0) {
    return Math.floor(Math.random() * (ceiling - floor)) + floor
  }
}
