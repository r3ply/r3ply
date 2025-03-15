import { expect, test } from 'vitest'
import { sanitize_html, md_to_html, tera } from '@r3ply/wasm'

test('it cleans', () => {
  let result = sanitize_html(
    "<p class='example' another='idk'>hello, world</p><div>not good</div><script>console.log('yo')</script><img src='/example.png'><!-- are comments allowed -->",
    ['p', '<!-- -->', 'div', 'IMG'],
  )
  // console.log(result)
})

// TODO: this isn't working how I want and I will need to change the rust code to add some kind of node filtering
test('code inside of elements that I want', () => {
  let code_fence = `
	<p>This is ok</p>
	<table>this is not ok</table>
	<pre class="language-html" data-lang="html" data-linenos="" style="color:#c0c5ce;background-color:#2b303b"><code class="language-html" data-lang="html"><table><tbody><tr><td>1</td><td><span>&lt;</span><span style="color:#bf616a">nav </span><span style="color:#d08770">class</span><span>="</span><span style="color:#a3be8c">flex h-16 items-center bg-red-400 px-2 text-3xl</span><span>"&gt;
</span></td></tr><tr><td>2</td><td><span>  &lt;</span><span style="color:#bf616a">span</span><span>&gt;Menu&lt;/</span><span style="color:#bf616a">span</span><span>&gt;
</span></td></tr><tr><td>3</td><td><span>  &lt;</span><span style="color:#bf616a">div </span><span style="color:#8fa1b3">id</span><span>="</span><span style="color:#a3be8c">menu</span><span>" </span><span style="color:#d08770">class</span><span>="</span><span style="color:#a3be8c">fixed right-0 top-16 bg-blue-400</span><span>"&gt;
</span></td></tr><tr><td>4</td><td><span>    &lt;</span><span style="color:#bf616a">ul </span><span style="color:#d08770">class</span><span>="</span><span style="color:#a3be8c">h-screen px-4 py-2 text-2xl</span><span>"&gt;
</span></td></tr><tr><td>5</td><td><span>      &lt;</span><span style="color:#bf616a">li</span><span>&gt;Link 1&lt;/</span><span style="color:#bf616a">li</span><span>&gt;
</span></td></tr><tr><td>6</td><td><span>      &lt;</span><span style="color:#bf616a">li</span><span>&gt;Link 2&lt;/</span><span style="color:#bf616a">li</span><span>&gt;
</span></td></tr><tr><td>7</td><td><span>      &lt;</span><span style="color:#bf616a">li</span><span>&gt;Link 3&lt;/</span><span style="color:#bf616a">li</span><span>&gt;
</span></td></tr><tr><td>8</td><td><span>      &lt;</span><span style="color:#bf616a">li</span><span>&gt;Link 5&lt;/</span><span style="color:#bf616a">li</span><span>&gt;
</span></td></tr><tr><td>9</td><td><span>      &lt;</span><span style="color:#bf616a">li</span><span>&gt;Link 5&lt;/</span><span style="color:#bf616a">li</span><span>&gt;
</span></td></tr><tr><td>10</td><td><span>    &lt;/</span><span style="color:#bf616a">ul</span><span>&gt;
</span></td></tr><tr><td>11</td><td><span>  &lt;/</span><span style="color:#bf616a">div</span><span>&gt;
</span></td></tr><tr><td>12</td><td><span>&lt;/</span><span style="color:#bf616a">nav</span><span>&gt;
</span></td></tr></tbody></table></code></pre>
	`
  // console.log(clean_wasm(code_fence, ['pre', 'code']))
})

test('markdown', () => {
  let html = md_to_html(`
# Let's try a code example

\`\`\`ts
console.log(html);
\`\`\`

![An image](/example.png "don't forget you can also do this")

<p class="FOO">How about if html is just embedded inside?</p>

\`inline code \`
	`)
  // console.log(html)
})

test('markdown with ammonia', () => {
  let md = `
List

* A
* B
* C

\`\`\`html
<script>alert('evil')</script>
\`\`\`

*italics* **bold** ~~strikethrough~~
`
  let html = md_to_html(md)
  // console.log(`JUST HTML: ${html}`)

  let cleaned = sanitize_html(html, ['ul', 'li', 'em'])
  // console.log(`CLEANED: ${cleaned}`)

  let cleaned_before_converted = sanitize_html(md, ['ul', 'li', 'em'])
  // console.log(`CLEANED BEFORE HTML: ${cleaned_before_converted}`)
})

test('tera', () => {
  expect(tera('Hello, {{ name }}', { name: 'bob', age: 42 })).toBe('Hello, bob')
  expect(() =>
    tera('Hello, {{ occupation }}', { name: 'bob', age: 42 }),
  ).toThrowError()
  expect(tera('{{ name | upper}}', { name: 'bob' })).toBe('BOB')
  expect(tera('{{ [1, 2, 3, 4, 5, 6, 7, 8] | slice(end=5) }}', {})).toBe(
    '[1, 2, 3, 4, 5]',
  )
  // expect(tera("{{ 'hello' | truncate(length=1) }}", {})).toBe('h')

  const github_config = {
    type: 'github',
    repo: 'https://github.com/asimpletune/spenc.es',
    'file_path_{}': '/content/comments/{{ comment.id_8 }}.md',
    'commit_msg_{}': `Date: {{ email.date }}
Sender: {{ comment.author }}
dkim_pass: {{ email.auth.dkim }}
dmarc_pass: {{ email.auth.dmarc }}
spf_pass: {{ email.auth.spf }}
Subject: {{ email.subject }}
Comment:

> {{ comment.txt | split(pat="\n") | join(sep="\n> ") }}`,
    'pr_title_{}': 'New comment from `{{ comment.id_8 }}`',
    'pr_body_{}':
      "{#\n<!-- prettier-ignore-start -->\n#}\n{%- set dkim = email.auth.dkim -%}{%- set dmarc = email.auth.dmarc -%}{%- set spf = email.auth.spf -%}\n| Date: | {{ email.date }} |\n|:--------------|:-----------------------------------------------------------------------|\n| Sender: | (hashed to `{{ comment.author_7 }}[…]`) |\n| Auth Checks: | dkim={{ dkim }}, dmarc={{ dmarc }}, spf={{ spf }} |\n| Replying to: | {{ comment.subject.url }} |\n\n> {{ comment.txt | split(pat='\n') | join(sep='\n> ') }}\n\n## Options:\n\n• 🔮 preview comment [here](/TODO)\n• 🤮 To ban `{{ comment.author_7 }}[…]` from commenting in the future: [click here (TODO)](/todo)\n",
    'target_branch_{}':
      '{{ comment.ts_rcvd }}_{{ comment.id_8 }}-{{ comment.author_7 }}.md',
    enabled: true,
    allow_list: [],
    source_branch: 'main',
  }
  const context = {
    r3ply: {
      config_version: '0.0.1',
      server: 'r3ply.com',
      site: 'r3ply-config.spence.pages.dev',
    },
    comment: {
      id: 'd70ff344-d595-4e2a-a6ab-febb4121adfe',
      id_8: 'd70ff344',
      ts_rcvd: '1741540446',
      author:
        '88b0321464919f1d15763b8f711c7448f7e64c280854e4f85e60231dcbad0179',
      author_7: '88b0321',
      subject: {
        url: 'https://r3ply-config.spence.pages.dev/blog/lemonhead',
        origin: 'https://r3ply-config.spence.pages.dev',
        protocol: 'https:',
        hostname: 'r3ply-config.spence.pages.dev',
        path: '/blog/lemonhead',
      },
      txt: 'I found your banana picker.\nIt was here over by the tree\nlet me know if you ever need it\n\nmi casa es su casa',
      md: '<p>I found your banana picker.</p>\n',
      html: '<p>I found your banana picker.</p>\n',
    },
    email: {
      to: 'r3ply-config.spence.pages.dev@r3ply.com',
      subject: 'https://r3ply-config.spence.pages.dev/blog/lemonhead',
      date: '2023-06-20T20:28:11-02:00',
      text: 'I found your banana picker.',
      auth: {
        dkim: false,
        spf: false,
        dmarc: false,
        pass: false,
      },
    },
  }
  let target_branch = tera(github_config['target_branch_{}'], context)
  let new_comment_filepath = tera(github_config['file_path_{}'], context)
  let commit_msg = tera(github_config['commit_msg_{}'], context)
  let pr_msg_title = tera(github_config['pr_title_{}'], context)
  let pr_msg_body = tera(github_config['pr_body_{}'], context)

  // console.log(target_branch);
  // console.log(new_comment_filepath);
  // console.log(commit_msg);
  // console.log(pr_msg_title);
  // console.log(pr_msg_body)

  // console.log(tera("{{ 'shello' | split(pat='') | slice(start=2) | join(sep='') }}", {}))
  // console.log(tera("{% set string = '[1, 2, 3]' %}{{ string[1:] }}", {}))
  const comment_template = `+++
render = false
author = "{{ comment.author_7 }}"
date = {{ email.date }}
slug = "{{ comment.id_8 }}"

[taxonomies]
comment = ["{{ comment.id_8 }}"]
comments = ["{{ comment.subject.path[1:] }}"]
commenters = ["{{ comment.author_7 }}"]
threads = ["all"]
replies = ["0", "{{ comment.id_8 }}"]

[extra]
object_path = "{{ comment.subject.path }}"
filename = "{{ comment.ts_rcvd }}_{{ comment.id_8 }}-{{ comment.author_7 }}.md"
dt_written = {{ email.date }}
ts_rcvd = {{ comment.ts_rcvd }}
parent = "0"
comment_id = "{{ comment.id_8 }}"
comment_id_full = "{{ comment.id }}"
commenter_id = "{{ comment.author_7 }}"
email_hash = "{{ comment.author }}"
email_hash_version = "1.0.0"
auth = {{ email.auth.pass }}
dkim_pass = {{ email.auth.dkim }}
dmarc_pass = {{ email.auth.dmarc }}
spf_pass = {{ email.auth.spf  }}
+++

{{ comment.html }}
`
  // console.log(tera(comment_template, context))
})

import { Message } from '@mail-parser/ts-bindings'
import { Result } from 'oxide.ts'

test.skip('tera components', () => {
  const foo = `
{%- component normal(name) %}Hello, {{ name }}{% endcomponent -%}
{%- component w_body() %}Hello, {{ body }}{% endcomponent -%}
{%- component nested() %}{{ :normal(name=body) }}{% endcomponent -%}
{%- component typed_name(name: string) -%}Hello, {{ name }}{% endcomponent -%}
{%- component typed_obj2(data: map = { "name": "bob" }) -%}Hello, {{ data.name }}{% endcomponent -%}
{%- component typed_obj3(data: map = { "name": "bob" }) -%}Hello, {{ data["name"] }}{% endcomponent -%}
{% component navbar() {"css": "./array.css"} %}
 navbar stuff
{% endcomponent %}

{{ :normal(name="world") }}
{% :w_body() %}Steve{% endcomponent :w_body %}
{% :nested() %}Woz{% endcomponent :nested %}
{{ :typed_name(name="Types!") }}
{{ :typed_obj2() }}
{{ :typed_obj2(data={ "name": "alice" }) }}
{{ :typed_obj3(data={ "name": "alice" }) }}
{% set foo = "bar" %}
{{ :navbar() }}
`
  const bar = Result.safe(() => tera(foo, {}))
  if (bar.isErr()) {
    console.log(bar.unwrapErr().message)
  } else {
    console.log(bar.unwrap())
  }
})
