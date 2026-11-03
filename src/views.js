'use strict';

const { formatDate, initials, readingTime } = require('./content');

const SITE_NAME = 'HR Assignment Help';
const SITE_TAGLINE = 'Editorial guidance for HRM and MBA students';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function layout({ title, description, body, page = 'public', bodyClass = '' }) {
  const fullTitle = title ? `${title} \u00b7 ${SITE_NAME}` : `${SITE_NAME} \u00b7 ${SITE_TAGLINE}`;
  const isAdmin = page === 'admin';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description || 'Practical articles on human resource management, MBA study and academic writing.')}">
  <meta name="theme-color" content="#0f5c4d">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f5c4d'/%3E%3Ctext x='32' y='42' font-family='Georgia,serif' font-size='25' font-weight='700' fill='white' text-anchor='middle'%3EHR%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="/site.css">
</head>
<body class="${escapeHtml(bodyClass)}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="/" aria-label="${SITE_NAME} home">
        <span class="brand-mark" aria-hidden="true">HR</span>
        <span class="brand-name">Assignment Help<span>Journal</span></span>
      </a>
      ${isAdmin ? adminNav() : publicNav()}
    </div>
  </header>
  <main id="main">
    ${body}
  </main>
  <footer class="site-footer">
    <div class="shell footer-grid">
      <div>
        <a class="brand brand-footer" href="/">
          <span class="brand-mark" aria-hidden="true">HR</span>
          <span class="brand-name">Assignment Help<span>Journal</span></span>
        </a>
        <p class="footer-copy">Clear, practical reading on human resources, MBA study and academic writing. Written for students who want to think more carefully about the people side of business.</p>
      </div>
      <nav class="footer-nav" aria-label="Footer navigation">
        <div>
          <p class="footer-heading">Explore</p>
          <a href="/">Home</a>
          <a href="/#articles">All articles</a>
        </div>
        <div>
          <p class="footer-heading">Editorial</p>
          <a href="/admin">Dashboard</a>
          <a href="/admin/new">New article</a>
        </div>
      </nav>
    </div>
    <div class="shell footer-bottom">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
      <p>Made for curious HR professionals.</p>
    </div>
  </footer>
  <script src="/site.js"></script>
</body>
</html>`;
}

function publicNav() {
  return `<nav class="site-nav" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/#articles">Articles</a>
        <a class="nav-button" href="/admin">Editor</a>
      </nav>`;
}

function adminNav() {
  return `<nav class="site-nav admin-nav" aria-label="Editor navigation">
        <a href="/">View site</a>
        <a href="/admin">Dashboard</a>
        <a class="nav-button" href="/admin/new">New article</a>
      </nav>`;
}

function postPath(post) {
  return `/posts/${encodeURIComponent(post.slug)}`;
}

function coverMarkup(post, className, eager = false, alt = '') {
  if (post.coverImage) {
    return `<img class="${escapeHtml(className)}" src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(alt)}" loading="${eager ? 'eager' : 'lazy'}">`;
  }

  return `<div class="${escapeHtml(className)} cover-fallback" aria-hidden="true">
      <span>${escapeHtml(initials(post.category || 'HR'))}</span>
    </div>`;
}

function metaLine(post, { longDate = false, showAuthor = true } = {}) {
  const author = showAuthor
    ? `<span>${escapeHtml(post.author || 'Editorial Team')}</span>
    <span aria-hidden="true">&middot;</span>\n    `
    : '';

  return `${author}<time datetime="${escapeHtml(post.publishedAt || post.createdAt)}">${escapeHtml(formatDate(post.publishedAt || post.createdAt, { long: longDate }))}</time>
    <span aria-hidden="true">&middot;</span>
    <span>${readingTime(post.content)} min read</span>`;
}

function homePage({ posts, featured }) {
  const rest = posts.filter((post) => post.id !== featured?.id);
  const hasMore = rest.length > 0;

  const latestSection = hasMore || !featured
    ? `<section class="articles-section shell" id="articles">
        <div class="section-heading">
          <div>
            <p class="kicker">${hasMore ? 'Keep reading' : 'The latest'}</p>
            <h2>${hasMore ? 'More from the journal' : 'From the journal'}</h2>
          </div>
        </div>
        ${hasMore
          ? `<div class="post-grid">${rest.map(postCard).join('')}</div>`
          : emptyBlogState()}
      </section>`
    : '';

  const body = `
    <section class="home-hero shell">
      <div class="hero-copy">
        <p class="kicker">The HR Assignment Help journal</p>
        <h1>Field notes for the people side of business.</h1>
        <p class="hero-lede">Thoughtful, practical articles on human resources, talent, culture and postgraduate study &mdash; written for MBA and HRM students who want to work smarter.</p>
        <div class="hero-actions">
          <a class="button" href="#articles">Browse the journal</a>
          <a class="button button-quiet" href="/admin/new">Write an article</a>
        </div>
      </div>
      <aside class="hero-note" aria-label="What we publish">
        <p class="hero-note-label">On the desk</p>
        <ul>
          <li>HRM case-study thinking</li>
          <li>Talent, culture &amp; leadership</li>
          <li>Research and writing craft</li>
        </ul>
        <p class="hero-note-foot">${posts.length} ${posts.length === 1 ? 'article' : 'articles'} published</p>
      </aside>
    </section>

    ${featured ? featuredSection(featured, !hasMore) : ''}
    ${latestSection}`;

  return layout({
    title: '',
    description: 'Practical HRM and MBA articles on people strategy, talent, culture and academic writing.',
    body,
    bodyClass: 'home'
  });
}

function featuredSection(post, anchor) {
  return `<section class="featured-wrap shell"${anchor ? ' id="articles"' : ''} aria-labelledby="featured-title">
      <article class="featured-card">
        <a class="featured-media" href="${postPath(post)}" tabindex="-1" aria-hidden="true">
          ${coverMarkup(post, 'featured-image', true)}
        </a>
        <div class="featured-body">
          <div class="card-labels">
            <span class="chip">${escapeHtml(post.category || 'Guide')}</span>
            <span class="featured-label">Latest article</span>
          </div>
          <h2 id="featured-title"><a href="${postPath(post)}">${escapeHtml(post.title)}</a></h2>
          <p class="featured-excerpt">${escapeHtml(post.excerpt)}</p>
          <p class="meta-line">${metaLine(post)}</p>
          <a class="text-link" href="${postPath(post)}">Read the article <span aria-hidden="true">&rarr;</span></a>
        </div>
      </article>
    </section>`;
}

function postCard(post) {
  return `<article class="post-card">
      <a class="card-media" href="${postPath(post)}" tabindex="-1" aria-hidden="true">
        ${coverMarkup(post, 'card-image')}
      </a>
      <div class="card-body">
        <div class="card-labels">
          <span class="chip">${escapeHtml(post.category || 'Guide')}</span>
          <time class="card-date" datetime="${escapeHtml(post.publishedAt || post.createdAt)}">${escapeHtml(formatDate(post.publishedAt || post.createdAt))}</time>
        </div>
        <h3><a href="${postPath(post)}">${escapeHtml(post.title)}</a></h3>
        <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
        <p class="card-meta">${escapeHtml(post.author || 'Editorial Team')} &middot; ${readingTime(post.content)} min read</p>
      </div>
    </article>`;
}

function emptyBlogState() {
  return `<div class="empty-state">
      <p class="empty-title">The journal is waiting for its first article.</p>
      <p>Open the editor to write, format and publish a post.</p>
      <a class="button" href="/admin/new">Write the first article</a>
    </div>`;
}

function articlePage({ post, related }) {
  const headings = post.headings || [];
  const toc = headings.length >= 2
    ? `<aside class="article-aside">
        <nav class="toc" aria-label="On this page">
          <p class="toc-title">On this page</p>
          ${headings.map((heading) => `<a class="toc-link toc-level-${heading.level}" href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>`).join('')}
          <a class="toc-back" href="#top">&uarr; Back to top</a>
        </nav>
      </aside>`
    : '';

  const body = `
    <article class="article-page shell" id="top">
      <header class="article-header">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Journal</a>
          <span aria-hidden="true">/</span>
          <span>${escapeHtml(post.category || 'Guide')}</span>
        </nav>
        <span class="chip">${escapeHtml(post.category || 'Guide')}</span>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="article-dek">${escapeHtml(post.excerpt)}</p>
        <div class="article-byline">
          <span class="avatar" aria-hidden="true">${escapeHtml(initials(post.author))}</span>
          <div>
            <p class="byline-name">${escapeHtml(post.author || 'Editorial Team')}</p>
            <p class="meta-line">${metaLine(post, { longDate: true, showAuthor: false })}</p>
          </div>
        </div>
      </header>

      ${post.coverImage ? `<figure class="article-cover">${coverMarkup(post, 'article-cover-image', true, post.title)}</figure>` : ''}

      <div class="article-layout${toc ? '' : ' article-layout-single'}">
        <div class="prose">
          ${post.content}
        </div>
        ${toc}
      </div>

      <footer class="article-footer">
        <div>
          <p class="kicker">Keep reading</p>
          <p>More practical thinking for HRM and MBA students.</p>
        </div>
        <a class="button button-quiet" href="/">&larr; Back to the journal</a>
      </footer>
    </article>

    ${related.length ? `<section class="related shell" aria-labelledby="related-title">
      <div class="section-heading">
        <div>
          <p class="kicker">Continue exploring</p>
          <h2 id="related-title">Related reading</h2>
        </div>
      </div>
      <div class="post-grid">${related.map(postCard).join('')}</div>
    </section>` : ''}`;

  return layout({
    title: post.title,
    description: post.excerpt,
    body,
    bodyClass: 'article'
  });
}

function dashboardPage({ posts, notice }) {
  const published = posts.filter((post) => post.status === 'published').length;
  const drafts = posts.length - published;
  const noticeMarkup = noticeMessage(notice);

  const body = `
    <section class="admin-page shell">
      <div class="admin-heading">
        <div>
          <p class="kicker">Editorial desk</p>
          <h1>Articles</h1>
          <p class="admin-lede">Write, revise and publish posts for the journal.</p>
        </div>
        <a class="button" href="/admin/new">New article</a>
      </div>

      ${noticeMarkup}

      <div class="stat-strip" aria-label="Article statistics">
        <div><span class="stat-value">${posts.length}</span><span class="stat-label">Total articles</span></div>
        <div><span class="stat-value">${published}</span><span class="stat-label">Published</span></div>
        <div><span class="stat-value">${drafts}</span><span class="stat-label">Drafts</span></div>
      </div>

      ${posts.length ? `<ul class="admin-list">${posts.map(adminListItem).join('')}</ul>` : `<div class="empty-state empty-state-admin">
        <p class="empty-title">No articles yet.</p>
        <p>Start with a title and a few paragraphs &mdash; you can keep it as a draft until it is ready.</p>
        <a class="button" href="/admin/new">Write your first article</a>
      </div>`}
    </section>`;

  return layout({
    title: 'Articles',
    description: 'Editorial dashboard for the HR Assignment Help journal.',
    body,
    page: 'admin',
    bodyClass: 'admin'
  });
}

function adminListItem(post) {
  return `<li class="admin-item">
      <div class="admin-item-main">
        <div class="card-labels">
          <span class="status status-${post.status === 'draft' ? 'draft' : 'published'}">${post.status === 'draft' ? 'Draft' : 'Published'}</span>
          <span class="chip chip-plain">${escapeHtml(post.category || 'Guide')}</span>
        </div>
        <h2><a href="/admin/posts/${escapeHtml(post.id)}/edit">${escapeHtml(post.title)}</a></h2>
        <p class="admin-path">/posts/${escapeHtml(post.slug)}</p>
        <p class="admin-meta">Updated ${escapeHtml(formatDate(post.updatedAt))} &middot; ${readingTime(post.content)} min read</p>
      </div>
      <div class="admin-actions">
        ${post.status === 'published' ? `<a href="${postPath(post)}" target="_blank" rel="noopener noreferrer">View</a>` : ''}
        <a href="/admin/posts/${escapeHtml(post.id)}/edit">Edit</a>
        <form method="post" action="/admin/posts/${escapeHtml(post.id)}/delete" data-confirm="Delete &quot;${escapeHtml(post.title)}&quot;? This cannot be undone.">
          <button class="link-button link-danger" type="submit">Delete</button>
        </form>
      </div>
    </li>`;
}

function editorPage({ post, values, errors, isNew }) {
  const action = isNew ? '/admin/posts' : `/admin/posts/${escapeHtml(post.id)}`;
  const content = values.content || '';
  const words = content ? (content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length) : 0;
  const reading = Math.max(1, Math.ceil(words / 200));

  const errorMarkup = errors.length
    ? `<div class="alert alert-error" role="alert">
        <strong>Your article was not saved.</strong>
        <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>
      </div>`
    : '';

  const body = `
    <section class="editor-page shell">
      <div class="editor-heading">
        <div>
          <a class="back-link" href="/admin">&larr; All articles</a>
          <h1>${isNew ? 'New article' : 'Edit article'}</h1>
        </div>
        <div class="editor-heading-actions">
          <a class="button button-quiet" href="/admin">Cancel</a>
          <button class="button" type="submit" form="article-form">Save article</button>
        </div>
      </div>

      ${errorMarkup}

      <form id="article-form" class="editor-form" method="post" action="${action}" novalidate>
        <div class="editor-grid">
          <div class="editor-main">
            <div class="field">
              <label for="title">Article title</label>
              <input id="title" name="title" type="text" value="${escapeHtml(values.title)}" maxlength="160" required autocomplete="off" placeholder="A clear, specific headline" ${isNew ? 'autofocus' : ''}>
              <p class="field-help">Keep it descriptive. This is the main heading readers will see.</p>
            </div>

            <div class="editor-panel">
              <div class="editor-panel-head">
                <div class="editor-modes" role="tablist" aria-label="Editor mode">
                  <button type="button" class="editor-mode is-active" data-mode="write" role="tab" aria-selected="true">Write</button>
                  <button type="button" class="editor-mode" data-mode="html" role="tab" aria-selected="false">HTML</button>
                </div>
                <span class="editor-stats" id="editor-stats">${words} ${words === 1 ? 'word' : 'words'} &middot; ${reading} min read</span>
              </div>

              <div class="editor-toolbar" id="editor-toolbar" aria-label="Formatting toolbar">
                <label class="visually-hidden" for="block-format">Text style</label>
                <select id="block-format" class="toolbar-select" data-command="formatBlock">
                  <option value="p">Paragraph</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="blockquote">Quote</option>
                </select>
                <span class="toolbar-divider" aria-hidden="true"></span>
                <button type="button" class="toolbar-button" data-command="bold" title="Bold (Ctrl+B)" aria-label="Bold"><strong>B</strong></button>
                <button type="button" class="toolbar-button" data-command="italic" title="Italic (Ctrl+I)" aria-label="Italic"><em>I</em></button>
                <button type="button" class="toolbar-button" data-command="underline" title="Underline (Ctrl+U)" aria-label="Underline"><span class="underline">U</span></button>
                <span class="toolbar-divider" aria-hidden="true"></span>
                <button type="button" class="toolbar-button" data-command="insertUnorderedList" title="Bulleted list" aria-label="Bulleted list">List</button>
                <button type="button" class="toolbar-button" data-command="insertOrderedList" title="Numbered list" aria-label="Numbered list">1. List</button>
                <span class="toolbar-divider" aria-hidden="true"></span>
                <button type="button" class="toolbar-button" data-command="link" title="Add link (Ctrl+K)" aria-label="Add link">Link</button>
                <button type="button" class="toolbar-button" data-command="image" title="Add image from URL" aria-label="Add image">Image</button>
                <button type="button" class="toolbar-button" data-command="removeFormat" title="Clear formatting" aria-label="Clear formatting">Clear</button>
                <span class="toolbar-divider" aria-hidden="true"></span>
                <button type="button" class="toolbar-button" data-command="undo" title="Undo" aria-label="Undo">Undo</button>
                <button type="button" class="toolbar-button" data-command="redo" title="Redo" aria-label="Redo">Redo</button>
              </div>

              <div id="editor-surface" class="editor-surface prose" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article content" data-placeholder="Start writing your article here..."></div>
              <textarea id="content" name="content" class="editor-source" aria-label="Article HTML" hidden>${escapeHtml(content)}</textarea>
              <div class="editor-hint">
                <span>Use the toolbar to format text. Paste from Word or Google Docs is cleaned automatically.</span>
                <span>Ctrl/Cmd + S to save</span>
              </div>
            </div>
          </div>

          <aside class="editor-side">
            <div class="side-panel">
              <h2>Publishing</h2>
              <div class="field">
                <label for="status">Status</label>
                <select id="status" name="status">
                  <option value="published"${values.status === 'published' ? ' selected' : ''}>Published</option>
                  <option value="draft"${values.status === 'draft' ? ' selected' : ''}>Draft</option>
                </select>
              </div>
              <div class="field">
                <label for="slug">URL slug</label>
                <input id="slug" name="slug" type="text" value="${escapeHtml(values.slug)}" maxlength="100" placeholder="auto-generated-from-title" autocomplete="off" data-slug-input>
                <p class="field-help">Leave blank to create one from the title.</p>
              </div>
              <div class="field">
                <label for="category">Category</label>
                <input id="category" name="category" type="text" value="${escapeHtml(values.category)}" maxlength="60" placeholder="e.g. Talent &amp; Culture" autocomplete="off">
              </div>
              <div class="field">
                <label for="author">Author</label>
                <input id="author" name="author" type="text" value="${escapeHtml(values.author)}" maxlength="80" placeholder="Editorial Team" autocomplete="off">
              </div>
            </div>

            <div class="side-panel">
              <h2>Presentation</h2>
              <div class="field">
                <label for="coverImage">Cover image URL</label>
                <input id="coverImage" name="coverImage" type="url" value="${escapeHtml(values.coverImage)}" maxlength="500" placeholder="https://example.com/image.jpg" autocomplete="off">
                <p class="field-help">Optional. Use a wide landscape image.</p>
              </div>
              <div class="field">
                <label for="excerpt">Summary</label>
                <textarea id="excerpt" name="excerpt" rows="5" maxlength="300" placeholder="A short summary for cards and search results.">${escapeHtml(values.excerpt)}</textarea>
                <p class="field-help">Up to 300 characters. Left blank, it is taken from the opening text.</p>
              </div>
            </div>

            <div class="side-panel side-tips">
              <h2>Editor tips</h2>
              <ul>
                <li>Use Heading 2 for main sections so the contents menu works.</li>
                <li>Keep paragraphs short for comfortable reading.</li>
                <li>Save a draft first if you are still researching.</li>
              </ul>
            </div>
          </aside>
        </div>
      </form>
    </section>
    <script src="/editor.js"></script>`;

  return layout({
    title: isNew ? 'New article' : 'Edit article',
    description: 'Write and format an article for the HR Assignment Help journal.',
    body,
    page: 'admin',
    bodyClass: 'admin editor'
  });
}

function noticeMessage(notice) {
  const messages = {
    created: 'Article created.',
    updated: 'Changes saved.',
    deleted: 'Article deleted.'
  };
  if (!messages[notice]) return '';

  return `<div class="alert alert-success" role="status">${escapeHtml(messages[notice])}</div>`;
}

function notFoundPage() {
  const body = `<section class="not-found shell">
      <p class="kicker">404 &middot; Page not found</p>
      <h1>This page has left the building.</h1>
      <p>The article may have been unpublished, renamed, or never existed. Head back to the journal to find what you need.</p>
      <a class="button" href="/">Back to the journal</a>
    </section>`;

  return layout({
    title: 'Page not found',
    description: 'The page you were looking for could not be found.',
    body
  });
}

function errorPage() {
  const body = `<section class="not-found shell">
      <p class="kicker">Something went wrong</p>
      <h1>We could not load that page.</h1>
      <p>Please try again. If the problem continues, return to the journal homepage.</p>
      <a class="button" href="/">Back to the journal</a>
    </section>`;

  return layout({
    title: 'Server error',
    description: 'An unexpected error occurred.',
    body
  });
}

module.exports = {
  homePage,
  articlePage,
  dashboardPage,
  editorPage,
  notFoundPage,
  errorPage
};
