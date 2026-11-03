'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../app');

async function startApp(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'hr-blog-'));
  const dataFile = path.join(directory, 'posts.json');
  const app = createApp({ dataFile });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const { port } = server.address();

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });

  return {
    base: `http://127.0.0.1:${port}`,
    store: app.locals.store
  };
}

async function submit(base, pathname, fields, headers = {}) {
  return fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields).toString(),
    redirect: 'manual'
  });
}

function articleFields(overrides = {}) {
  return {
    title: 'A Practical Guide to Talent Reviews',
    slug: '',
    excerpt: '',
    category: 'Talent & Culture',
    author: 'Editorial Team',
    coverImage: '',
    status: 'published',
    content: '<h2>Start with the evidence</h2><p>Talent reviews work best when they are <strong>grounded in evidence</strong>.</p>',
    ...overrides
  };
}

async function createArticle(base, store, overrides = {}) {
  const response = await submit(base, '/admin/posts', articleFields(overrides));
  assert.equal(response.status, 303);
  const posts = await store.all();
  return posts[0];
}

test('creates a published article and renders it on the journal', async (t) => {
  const { base, store } = await startApp(t);

  const empty = await fetch(`${base}/`);
  assert.equal(empty.status, 200);
  assert.match(await empty.text(), /waiting for its first article/);

  const created = await createArticle(base, store, {
    content: '<h2>Start with the evidence</h2><p>Talent reviews work best when they are <strong>grounded in evidence</strong>.</p><h2>Make it useful</h2><p onclick="alert(2)">Read on.</p><script>alert(1)</script>'
  });

  assert.equal(created.slug, 'a-practical-guide-to-talent-reviews');
  assert.equal(created.status, 'published');
  assert.equal(created.headings.length, 2);
  assert.equal(created.headings[0].id, 'start-with-the-evidence');
  assert.ok(created.excerpt.startsWith('Talent reviews work best'));
  assert.equal(created.content.includes('<script'), false);
  assert.equal(created.content.includes('onclick'), false);

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /A Practical Guide to Talent Reviews/);

  const article = await fetch(`${base}/posts/${created.slug}`);
  const articleHtml = await article.text();
  assert.equal(article.status, 200);
  assert.match(articleHtml, /<h2 id="start-with-the-evidence">Start with the evidence<\/h2>/);
  assert.match(articleHtml, /toc-link/);
  assert.equal(articleHtml.includes('<script>alert'), false);

  const admin = await fetch(`${base}/admin`);
  assert.match(await admin.text(), /Published/);
});

test('updates an article and removes it', async (t) => {
  const { base, store } = await startApp(t);
  const created = await createArticle(base, store);

  const updatedResponse = await submit(base, `/admin/posts/${created.id}`, articleFields({
    title: 'Talent Reviews That Actually Change Decisions',
    slug: 'talent-reviews-that-change-decisions',
    content: '<h2>A better review</h2><p>Updated body copy for the revised article.</p>'
  }));
  assert.equal(updatedResponse.status, 303);
  assert.equal(updatedResponse.headers.get('location'), '/admin?notice=updated');

  const updated = await store.findById(created.id);
  assert.equal(updated.title, 'Talent Reviews That Actually Change Decisions');
  assert.equal(updated.slug, 'talent-reviews-that-change-decisions');
  assert.match(updated.content, /Updated body copy/);

  const newPage = await fetch(`${base}/posts/talent-reviews-that-change-decisions`);
  assert.equal(newPage.status, 200);
  assert.match(await newPage.text(), /Updated body copy/);

  const oldPage = await fetch(`${base}/posts/${created.slug}`);
  assert.equal(oldPage.status, 404);

  const deleted = await submit(base, `/admin/posts/${created.id}/delete`, {});
  assert.equal(deleted.status, 303);
  assert.equal(await store.findById(created.id), null);

  const dashboard = await fetch(`${base}/admin`);
  assert.equal((await dashboard.text()).includes('Talent Reviews That Actually Change Decisions'), false);
});

test('validates input and keeps drafts off the public site', async (t) => {
  const { base, store } = await startApp(t);

  const missing = await submit(base, '/admin/posts', articleFields({ title: '', content: '' }));
  assert.equal(missing.status, 400);
  const missingHtml = await missing.text();
  assert.match(missingHtml, /Add an article title/);
  assert.match(missingHtml, /Add some article content/);
  assert.equal((await store.all()).length, 0);

  const badCover = await submit(base, '/admin/posts', articleFields({ coverImage: 'javascript:alert(1)' }));
  assert.equal(badCover.status, 400);
  assert.match(await badCover.text(), /cover image must be an http/);

  const badSlug = await submit(base, '/admin/posts', articleFields({ slug: '!!!' }));
  assert.equal(badSlug.status, 400);
  assert.match(await badSlug.text(), /slug needs at least one letter or number/);

  const draft = await createArticle(base, store, {
    title: 'Work in Progress',
    status: 'draft',
    content: '<p>Not ready for readers yet.</p>'
  });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.publishedAt, null);

  const home = await fetch(`${base}/`);
  assert.equal((await home.text()).includes('Work in Progress'), false);

  const draftPage = await fetch(`${base}/posts/${draft.slug}`);
  assert.equal(draftPage.status, 404);

  const admin = await fetch(`${base}/admin`);
  assert.match(await admin.text(), /Draft/);
});

test('keeps slugs unique and sanitizes links and duplicate headings', async (t) => {
  const { base, store } = await startApp(t);

  const first = await createArticle(base, store, { title: 'Same Title' });
  const second = await createArticle(base, store, { title: 'Same Title' });

  assert.equal(first.slug, 'same-title');
  assert.equal(second.slug, 'same-title-2');

  const unsafe = await createArticle(base, store, {
    title: 'Links and Headings',
    content: '<h2>Overview</h2><p>First.</p><h2>Overview</h2><p>Second.</p><a href="javascript:alert(1)">Bad link</a><a href="https://example.com" target="_blank">Good link</a><div class="table-wrap"><table><thead><tr><th>Heading</th></tr></thead><tbody><tr><td>Value</td></tr></tbody></table></div><div>Browser paragraph</div>'
  });

  assert.deepEqual(unsafe.headings.map((heading) => heading.id), ['overview', 'overview-2']);
  assert.equal(unsafe.content.includes('javascript:'), false);
  assert.match(unsafe.content, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/);
  assert.match(unsafe.content, /class="table-wrap"/);
  assert.match(unsafe.content, /<table>/);
  assert.equal(unsafe.content.includes('<div>Browser paragraph</div>'), false);
  assert.match(unsafe.content, /<p>Browser paragraph<\/p>/);
});

test('assigns unique slugs to concurrent submissions', async (t) => {
  const { base, store } = await startApp(t);

  const responses = await Promise.all([
    submit(base, '/admin/posts', articleFields({ title: 'Double Submit' })),
    submit(base, '/admin/posts', articleFields({ title: 'Double Submit' }))
  ]);
  assert.deepEqual(responses.map((response) => response.status), [303, 303]);

  const slugs = (await store.all()).map((post) => post.slug).sort();
  assert.deepEqual(slugs, ['double-submit', 'double-submit-2']);
});

test('blocks cross-site admin writes but allows same-origin posts', async (t) => {
  const { base, store } = await startApp(t);

  const crossSite = await submit(base, '/admin/posts', articleFields(), {
    'sec-fetch-site': 'cross-site'
  });
  assert.equal(crossSite.status, 403);

  const crossOrigin = await submit(base, '/admin/posts', articleFields(), {
    origin: 'https://evil.example'
  });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await store.all()).length, 0);

  const sameOrigin = await submit(base, '/admin/posts', articleFields(), {
    origin: base,
    'sec-fetch-site': 'same-origin'
  });
  assert.equal(sameOrigin.status, 303);
  assert.equal((await store.all()).length, 1);
});
