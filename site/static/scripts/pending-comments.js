/**
 * To understand this you have to look at comments.html inside the site's Zola config.
 *
 * A nested <template> of a comment is written there and then used here.
 *
 * (comments arrive as an array of CommentTemplateContext & EmailTemplateContext objects)
 */
async function render_pending_comments(comments) {
  const filtered_and_sorted = comments
    // we start only with the root comments
    .filter(c => is_root(c))
    // in reverse chronological order
    .sort((a, b) => b.comment.ts_rcvd - a.comment.ts_rcvd)

  // then render each thread once
  return filtered_and_sorted.map(head => render_thread(head, comments, 1, head))
}

function render_thread(head, comments, level, root) {
  const siblings = comments.filter(c => is_root(head) ? is_root(c) : in_reply_to(c) == in_reply_to(head))
  const head_index = siblings.findIndex(c => get_slug(c) == get_slug(head))
  const prev = siblings[head_index - 1] || false
  const next = siblings[head_index + 1] || false
  const template_node = document.querySelector("#comment-template").content.cloneNode(true)
  const details = template_node.querySelector('details')
  details.id = get_slug(head)
  details.classList.remove("group/1")
  details.classList.add(`group/${level}`)
  render_summary(head, level, root, prev, next, template_node)
  render_article(head, template_node)
  const comment_article = details.querySelector('div')
  const children = comments.filter(c => in_reply_to(c) == `#${get_slug(head)}`)
  children.forEach(c => comment_article.appendChild(render_thread(c, comments, level + 1, root)))
  return template_node
}

// Renders the <summary>
function render_summary(head, level, root, prev, next, template) {
  render_preview_text(head, level, template)
  render_root_nav(root, level, template)
  render_parent_nav(head, level, template)
  render_current_nav(head, template)
  render_next_nav(next, template)
  render_prev_nav(prev, template)
}
// {{ comment.content | striptags | truncate(length=128) }}
function render_preview_text(head, level, template_node) {
  const span = template_node.querySelector("[data-comment-text-preview]")
  span.innerText = stripHTML(head.comment.txt)
  span.classList.remove(`group-open/1:hidden`)
  span.classList.add(`group-open/${level}:hidden`)
}
// Renders the summary's 'root' nav
function render_root_nav(root, level, template_node) {
  if (level >= 3) {
    const template = template_node.querySelector("#comment-nav-render-root-true")
    const fragment = template.content.cloneNode(true)
    fragment.querySelector('a').href = `#${ get_slug(root) }`
    template.replaceWith(fragment)
  } else {
    const template = template_node.querySelector("#comment-nav-render-root-false")
    const fragment = template.content.cloneNode(true)
    template.replaceWith(fragment)
  }
}
// Renders the summary's 'parent' nav
function render_parent_nav(head, level, template_node) {
  if (level >= 2) {
    const template = template_node.querySelector("#comment-nav-render-parent-true")
    const fragment = template.content.cloneNode(true)
    fragment.querySelector('a').href = `${ in_reply_to(head) }`
    template.replaceWith(fragment)
  } else {
    const template = template_node.querySelector("#comment-nav-render-parent-false")
    const fragment = template.content.cloneNode(true)
    template.replaceWith(fragment)
  }
}
// Renders the summary's 'current' nav
function render_current_nav(head, template_node) {
  const template = template_node.querySelector("#comment-nav-render-current")
  const fragment = template.content.cloneNode(true)
  fragment.querySelector('a').href = `#${ get_slug(head) }`
  template.replaceWith(fragment)
}
// Renders the summary's 'next' nav
function render_next_nav(next, template_node) {
  if (next) {
    const template = template_node.querySelector("#comment-nav-render-next-true")
    const fragment = template.content.cloneNode(true)
    fragment.querySelector('a').href = `#${ get_slug(next) }`
    template.replaceWith(fragment)
  } else {
    const template = template_node.querySelector("#comment-nav-render-next-false")
    const fragment = template.content.cloneNode(true)
    template.replaceWith(fragment)
  }
}
// Renders the summary's 'prev' nav
function render_prev_nav(prev, template_node) {
  if (prev) {
    const template = template_node.querySelector("#comment-nav-render-prev-true")
    const fragment = template.content.cloneNode(true)
    fragment.querySelector('a').href = `#${ get_slug(prev) }`
    template.replaceWith(fragment)
  } else {
    const template = template_node.querySelector("#comment-nav-render-prev-false")
    const fragment = template.content.cloneNode(true)
    template.replaceWith(fragment)
  }
}
// Renders the comment's <article>
function render_article(head, template_node) {
  const article_template = template_node.querySelector("#comment-article-template")
  const article = article_template.content.cloneNode(true)
  // Comment-ID
  const comment_id_field = article.querySelector('[data-comment-id-field]')
  comment_id_field.innerText = `${get_slug(head)}…`
  comment_id_field.classList.add("cursor-not-allowed")
  // From
  const from_field = article.querySelector('[data-from-field]')
  from_field.innerText = `${get_author(head)}…`
  from_field.href = `/commenters/${get_author(head)}`
  // Subject
  const subject_field = article.querySelector('[data-subject-field]')
  const subject_md = subject_field.querySelector('[data-subject-md]')
  subject_md.href = get_subject_path(head)
  subject_md.innerText = get_subject_path(head)
  const subject_sm = subject_field.querySelector('[data-subject-sm]')
  subject_sm.href = get_subject_path(head)
  subject_sm.innerText = head.comment.subject.fragment ?? "./"
  // Date
  const date_field = article.querySelector('[data-date-field]')
  const date_md = date_field.querySelector('[data-date-md]')
  const date = get_date(head)
  date_md.querySelector('[data-date-md-day]').innerText = date.day_of_week
  date_md.querySelector('[data-date-d-b-Y-H]').innerText = `${date.day} ${date.month} ${date.year} ${date.hour}`
  date_md.querySelector('[data-date-min]').innerText = date.minutes
  date_md.querySelector('[data-date-sec]').innerText = date.seconds
  date_md.querySelector('[data-date-tz]').innerText = date.tz
  // Auth
  head.email.auth.dkim == true
    ? article.querySelector('#dkim-pass-template')
      .replaceWith(article.querySelector('#dkim-pass-template').content.cloneNode(true))
    : article.querySelector('#dkim-fail-template')
      .replaceWith(article.querySelector('#dkim-fail-template').content.cloneNode(true))
  head.email.auth.spf == true
    ? article.querySelector('#spf-pass-template')
      .replaceWith(article.querySelector('#spf-pass-template').content.cloneNode(true))
    : article.querySelector('#spf-fail-template')
      .replaceWith(article.querySelector('#spf-fail-template').content.cloneNode(true))
  head.email.auth.dmarc == true
    ? article.querySelector('#dmarc-pass-template')
      .replaceWith(article.querySelector('#dmarc-pass-template').content.cloneNode(true))
    : article.querySelector('#dmarc-fail-template')
      .replaceWith(article.querySelector('#dmarc-fail-template').content.cloneNode(true))
  // Comment text fragment
  const txt_fragment_href = get_text_fragment(head)
  if (txt_fragment_href) {
    const txt_fragment = article.querySelector('#comment-text-fragment-template')
      .content.cloneNode(true)
    txt_fragment.querySelector('[data-text-fragment-src]').href = txt_fragment_href
    txt_fragment.querySelector('[data-text-fragment-content] blockquote').innerText = decodeURIComponent(txt_fragment_href.replace("#:~:text=", ""))
    article.querySelector('#comment-text-fragment-template').replaceWith(txt_fragment)
  }
  // Comment Content
  const comment_content = article.querySelector('#comment-content-template').content.cloneNode(true)
  const temp_container = document.createElement('div')
  temp_container.innerHTML = head.comment.html
  comment_content.replaceChildren(...temp_container.childNodes)
  article.querySelector('#comment-content-template').replaceWith(comment_content)
  article_template.replaceWith(article)
}
// JS version of comment.template.md's `[:8]`
function get_slug(ctx) {
  return ctx.comment.id.slice(0, 8)
}
// JS version of same logic as [extra.comment.root] (in comment.template.md)
function is_root(ctx) {
  return typeof ctx.comment.subject.fragment === "undefined"
    || ctx.comment.subject.fragment?.startsWith("#:~:text")
    || false
}
// JS version of same logic as [extra.comment.in_reply_to] (in comment.template.md)
function in_reply_to(ctx) {
  return ctx.comment.subject.fragment || false
}
// JS version of comment.template.md's `[:7]`
function get_author(ctx) {
  return ctx.author.pseudonym.slice(0, 7)
}
// gets the subject path with an a fragment optionally appended
function get_subject_path(ctx) {
  return `${ctx.comment.subject.path}${ctx.comment.subject.fragment ?? ""}`
}
// gets the text fragment of the subject url or false
function get_text_fragment(ctx) {
  if (ctx.comment.subject.fragment && ctx.comment.subject.fragment.startsWith("#:~:text=")) {
    return ctx.comment.subject.fragment
  } else return false
}
// breaks down the date into its individual compoments
function get_date(ctx) {
  const date = new Date(ctx.email.date)
  const day_of_week = date.toLocaleDateString('en-US', { weekday: 'short' })
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  const hour = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const offset = date.getTimezoneOffset()
  const sign = offset > 0 ? '-' : '+'
  const abs = Math.abs(offset)
  const tz = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`
  return {
    day_of_week,
    day,
    month,
    year,
    hour,
    minutes,
    seconds,
    tz,
  }
}
function stripHTML(text) {
  const template = document.createElement('template');
  template.innerHTML = text;
  return template.content.textContent || '';
}