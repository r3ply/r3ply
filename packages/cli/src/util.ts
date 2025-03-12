import path from 'path'
import fs from 'fs'
import { Result } from 'oxide.ts'

export async function find_up(filename: string, cwd: string = process.cwd()): Promise<string | undefined> {
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

export function unsafeUnwrap<T, E>(result: Result<T, E>): T {
  return result.unwrapOrElse(() => {
    throw result.unwrapErr()
  })
}

export function random_int(ceiling: number, floor: number = 0) {
  return Math.floor(Math.random() * (ceiling - floor)) + floor
}
