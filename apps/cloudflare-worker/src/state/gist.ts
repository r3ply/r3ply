import { Octokit } from '@octokit/rest'
import { Result } from 'oxide.ts'
import { OmitFirstParameter } from '../util'

// An object consisting of the filename as the key, with the content as a string
export type GistFiles = { [key: string]: { content: string } }

/**
 * Create a gist from some files
 * @param gist_token the API token
 * @param files an object consisting of the filename as the key, with the content as a string
 * @param [description] an optional description of the gist
 * @returns a `Result` of a URL and an ID that can be used in additional API calls (or an `Err<Error>`)
 */
async function create_gist(
  gist_token: string,
  files: GistFiles,
  description?: string,
) {
  const octokit = new Octokit({ auth: gist_token })
  let gist_rep = octokit.gists
    .create({ files, description, public: false })
    .then((rep) => {
      if (rep.status != 201) {
        let err_msg = `Error storing email in gist: ${JSON.stringify(rep)}`
        console.error(err_msg)
        throw new Error(err_msg)
      } else
        return {
          id: rep.data.id!,
          url: rep.data.html_url!,
        }
    })
  return Result.safe(gist_rep)
}

/**
 * Update a gist with some files
 * @param gist_token the API token
 * @param gist_id ID that references the gist to update
 * @param files an object consisting of the filename as the key, with the content as a string
 * @returns a `Result` of void (or an `Err<Error>`)
 */
async function update_gist(
  gist_token: string,
  gist_id: string,
  files: GistFiles,
) {
  const octokit = new Octokit({ auth: gist_token })
  let gist_rep = octokit.gists.update({ gist_id, files }).then((rep) => {
    if (rep.status != 200) {
      let err_msg = `There was an error updating the gist with the comment data, more info: ${JSON.stringify(rep)}`
      console.error(err_msg)
      throw new Error(err_msg)
    } else return Promise.resolve()
  })
  return Result.safe(gist_rep)
}

export interface GistClient {
  create_gist: OmitFirstParameter<typeof create_gist>
  update_gist: OmitFirstParameter<typeof update_gist>
}
export function GistClient(gist_token: string): GistClient {
  return {
    create_gist: (files: GistFiles, description?: string) =>
      create_gist(gist_token, files, description),
    update_gist: (gist_id: string, files: GistFiles) =>
      update_gist(gist_token, gist_id, files),
  }
}
