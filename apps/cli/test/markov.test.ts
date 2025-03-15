import { describe, test } from 'vitest'

import { RiMarkov, RiTa } from 'rita'
import fs from 'fs'
import { generate } from '../src/lib'
import { receive } from '@r3ply/lib'

import {
  sanitize_html,
  md_to_html,
  tera,
  unescape_html,
  parse_email_str,
} from '@r3ply/wasm'

describe('CLI library', () => {
  test('rita in-memory', async () => {
    // Create a Markov generator
    const markov = RiTa.markov(2) // N-gram size
    markov.addText(`A crazy fact is that a higher percentage of Irish died in the Great Famine (well over 10% of the population) than in the Bengal famine in India in 1943 (about 3.5%).
This is a fascinating point:
> In 1837, two years after Alexis de Tocqueville published the first volume of “Democracy in America,” his lifelong collaborator, Gustave de Beaumont, went to Ireland, a country the two men had previously visited together. The book de Beaumont produced in 1839, “L’Irlande: Sociale, Politique et Religieuse,” was a grim companion piece to his friend’s largely optimistic vision of the future that was taking shape on the far side of the Atlantic. De Beaumont, a grandson by marriage of the Marquis de Lafayette, understood that, while the United States his ancestor had helped to create was a vigorous outgrowth of the British political traditions he and de Tocqueville so admired, Ireland was their poisoned fruit. America, he wrote, was “the land where destitution is the exception,” Ireland “the country where misery is the common rule.”`)
    markov.addText(`I'm not sure how to verify your comment since 538 was cut by ABC a month or 2 ago. But Nate Silver's pollster rating methodology is pretty much the same as 538's was during his tenure there and can be found here: https://www.natesilver.net/p/pollster-ratings-silver-bulleti...
It actually explicitly looks for statistical evidence of "herding" (e.g. not publishing poll results that might go against the grain) and penalized those pollsters.
In both rating systems, polls that had a long history of going against the grain and being correct, like Ann Seltzer's Iowa poll, were weight very heavily. Seltzer went heavily against the grain 3 elections in a row and was almost completely correct the first 2 times. This year she was off by a massive margin (ultimately costing her her career). Polls that go heavily against the grain but DON'T have a polling history simply aren't weighted heavily in general.`)
    markov.addText(`This is also a common side effect of corporate policies that favour short term profits rather than retaining staff for the long term.
I see this scenario play out constantly:
1. A team or staff member has a project's data located on their user account or hardware.
2. The team or staff member are made redundant when there is a dip in earnings.
3. IT make a backup of the user account/s and wipe the hardware, and because it's older usually move it on.
4. Months or years later that data is needed and at this point no one at the company actually knows where the data is - and even if they find something, they don't know if that's the latest or the full version.
Now this wouldn't be a problem if there was a decent overlap in staff retention, but that simply isn't the case these days.
Writing better storage policies doesn't help - it's the understaffed nature of their businesses which mean that there is no time for staff to keep up with basic data housekeeping.
The types of data that clients should have on hand, but nevertheless have asked me to supply, are frankly embarrassing.`)
    markov.addText(`Ah, the delights of a page that covers 26 years of history and hasn't been updated for 21 years
I can at least say that in the meantime, RISC OS is still alive and now open, available from https://www.riscosopen.org/, and most people will know the ARM company and its architectures went from strength to strength, even if the RISC PC faded away.`)

    // Generate an email body
    console.log(
      'Generated Email Body (RiTa.js):\n',
      markov.generate({ minLength: 10 }),
    )
    console.log('Generated Email Body (RiTa.js):\n', markov.generate())
    console.log('Generated Email Body (RiTa.js):\n', markov.generate())
    console.log('Generated Email Body (RiTa.js):\n', markov.generate())
  })
  test('rita pretrained as json', async () => {
    // Load the pre-trained model
    const modelData = fs.readFileSync(
      './src/comments/comments-markov-model.json',
      'utf-8',
    )

    // Create a Markov generator and load the pre-trained model
    const markov = RiMarkov.fromJSON(modelData)

    // Generate a new comment
    const newComment = markov.generate({
      minLength: 10,
      maxLength: 128,
      temperature: 1,
      allowDuplicates: true,
      // seed: ["code"]
    })
    console.log('Generated Comment:', newComment)
  })

  test('email generation', async () => {
    console.log(`from: ${generate.email_addr().addr}`)
    console.log(`from: ${generate.email_addr().addr}`)
    console.log(`from: ${generate.email_addr().addr}`)
    console.log(`from: ${generate.email_addr().addr}`)
    console.log(`from: ${generate.email_addr().addr}`)
    console.log(`from: ${generate.email_addr().addr}`)

    console.log(generate.subject(new URL('https://spenc.es')))
    console.log(generate.subject(new URL('https://spenc.es')))

    console.log(generate.date())
    console.log(generate.date())
    console.log(generate.date())
    console.log(generate.date())

    console.log(
      await generate.email('spenc.es', ['r3ply.com', 'r3ply-test.com']),
    )
    console.log(
      await generate.email('spenc.es', ['r3ply.com', 'r3ply-test.com']),
    )
    console.log(
      await generate.email('spenc.es', ['r3ply.com', 'r3ply-test.com']),
    )
    console.log(
      await generate.email('spenc.es', ['r3ply.com', 'r3ply-test.com']),
    )
    console.log(
      await generate.email('spenc.es', ['r3ply.com', 'r3ply-test.com']),
    )
  })

  test('preprocessing for training data', async () => {
    const ignore = [
      /["'\(\)\[\]{}]/i,
      /(www|\.com|job|hire|salary|use this format)/,
    ]
    console.log(ignore.some((r) => r.test('hello')))
    console.log(ignore.some((r) => r.test("'hello'")))
    console.log(ignore.some((r) => r.test('hello www.helloworld')))
    console.log(ignore.some((r) => r.test('hello www.helloworld')))
    console.log(ignore.some((r) => r.test('foo.com')))
    console.log(ignore.some((r) => r.test('{')))
    console.log(ignore.some((r) => r.test('[')))
    console.log(ignore.some((r) => r.test(')')))
    console.log(ignore.some((r) => r.test('use this format')))
  })

  test('import wasm modules', async () => {
    console.log(sanitize_html('<p>Hello, </p>world!', []))
    console.log(md_to_html('# Introduction'))
    console.log(tera('Hello, {{ name }}', { name: 'bob' }))
    console.log(
      tera('{{ title | truncate(length=5) }}', { title: '123456789' }),
    )
    console.log(
      unescape_html(
        `I don&#x27;t consider myself entirely noob-ish in software". How can I clean that all?`,
      ),
    )
    console.log(receive())
  })

  test.only('debug email', async () => {
    const email = `Date: 2023-11-19T06:57:50.000Z
From: Belinda.Strasser@grog.io
To: spenc.es@r3ply.com
Message-Id: <72c686a4-5bae-4721-88ea-6d6eb99378e2@grog.io>
Subject: https://spenc.es/rankings/monkey-kombat-strategy-guide

What tools or techniques do you use to plan it, how quickly do you jump into implementation, and what advice do you have for others in starting new medium-scale projects?

`

    const parsed_from_str = parse_email_str(email)
  })
})
