'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');

const { PostStore } = require('./src/posts-store');
const {
  sanitizeArticleHtml,
  firstParagraphText,
  slugify,
  makeExcerpt,
  isAllowedImageUrl
} = require('./src/content');
const views = require('./src/views');

const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'posts.json');
const MAX_CONTENT_LENGTH = 300_000;

function createApp({ dataFile = process.env.DATA_FILE || DEFAULT_DATA_FILE } = {}) {
  const app = express();
  const store = new PostStore(dataFile);

  app.disable('x-powered-by');
  app.locals.store = store;

  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: app.get('env') === 'production' ? '1d' : 0
  }));

  app.use('/admin', adminAuth);
  app.use('/admin', blockCrossSiteRequests);
  app.use('/admin', (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/', async (request, response) => {
    const posts = await store.all();
    const published = posts
      .filter((post) => post.status === 'published')
      .sort(byPublishedDate);

    response.send(views.homePage({
      posts: published,
      featured: published[0] || null
    }));
  });

  app.get('/posts/:slug', async (request, response) => {
    const post = await store.findBySlug(request.params.slug);
    if (!post || post.status !== 'published') {
      return notFound(response);
    }

    const posts = await store.all();
    const related = posts
      .filter((item) => item.status === 'published' && item.id !== post.id)
      .sort((a, b) => {
        const categoryMatch = Number(b.category === post.category) - Number(a.category === post.category);
        return categoryMatch || byPublishedDate(a, b);
      })
      .slice(0, 3);

    response.send(views.articlePage({ post, related }));
  });

  app.get('/admin', async (request, response) => {
    const posts = (await store.all()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    response.send(views.dashboardPage({
      posts,
      notice: typeof request.query.notice === 'string' ? request.query.notice : ''
    }));
  });

  app.get('/admin/new', (request, response) => {
    response.send(views.editorPage({
      post: {},
      values: emptyValues(),
      errors: [],
      isNew: true
    }));
  });

  app.get('/admin/posts/:id/edit', async (request, response) => {
    const post = await store.findById(request.params.id);
    if (!post) return notFound(response);

    response.send(views.editorPage({
      post,
      values: valuesFromPost(post),
      errors: [],
      isNew: false
    }));
  });

  app.post('/admin/posts', async (request, response) => {
    const checked = preparePost(readForm(request.body || {}));

    if (checked.errors.length) {
      return response.status(400).send(views.editorPage({
        post: {},
        values: checked.values,
        errors: checked.errors,
        isNew: true
      }));
    }

    await store.create(checked.fields);
    response.redirect(303, '/admin?notice=created');
  });

  app.post('/admin/posts/:id', async (request, response) => {
    const existing = await store.findById(request.params.id);
    if (!existing) return notFound(response);

    const checked = preparePost(readForm(request.body || {}));

    if (checked.errors.length) {
      return response.status(400).send(views.editorPage({
        post: existing,
        values: checked.values,
        errors: checked.errors,
        isNew: false
      }));
    }

    const publishedAt = checked.fields.status === 'published'
      ? existing.publishedAt || new Date().toISOString()
      : null;

    await store.update(existing.id, { ...checked.fields, publishedAt });
    response.redirect(303, '/admin?notice=updated');
  });

  app.post('/admin/posts/:id/delete', async (request, response) => {
    const removed = await store.remove(request.params.id);
    if (!removed) return notFound(response);

    response.redirect(303, '/admin?notice=deleted');
  });

  app.use((request, response) => notFound(response));

  // eslint-disable-next-line no-unused-vars
  app.use((error, request, response, next) => {
    console.error(error);
    if (response.headersSent) return next(error);

    const status = error.type === 'entity.too.large' ? 413 : 500;
    response.status(status).send(views.errorPage());
  });

  return app;
}

function emptyValues() {
  return {
    title: '',
    slug: '',
    excerpt: '',
    category: '',
    author: 'Editorial Team',
    coverImage: '',
    status: 'published',
    content: ''
  };
}

function valuesFromPost(post) {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    coverImage: post.coverImage || '',
    status: post.status,
    content: post.content
  };
}

function readForm(body) {
  const field = (name) => {
    const value = body[name];
    return typeof value === 'string' ? value.trim() : '';
  };

  return {
    title: field('title'),
    slug: field('slug'),
    excerpt: field('excerpt'),
    category: field('category'),
    author: field('author'),
    coverImage: field('coverImage'),
    status: field('status') === 'draft' ? 'draft' : 'published',
    content: typeof body.content === 'string' ? body.content : ''
  };
}

function preparePost(input) {
  const values = { ...input };
  const errors = [];

  if (!values.title) {
    errors.push('Add an article title.');
  } else if (values.title.length > 160) {
    errors.push('The title must be 160 characters or fewer.');
  }

  if (values.slug && !slugify(values.slug)) {
    errors.push('The URL slug needs at least one letter or number.');
  }

  if (values.excerpt.length > 300) {
    errors.push('The summary must be 300 characters or fewer.');
  }

  if (values.category.length > 60) {
    errors.push('The category must be 60 characters or fewer.');
  }

  if (values.author.length > 80) {
    errors.push('The author name must be 80 characters or fewer.');
  }

  if (values.coverImage && !isAllowedImageUrl(values.coverImage)) {
    errors.push('The cover image must be an http(s) URL or a path starting with /.');
  }

  if (!values.content.trim()) {
    errors.push('Add some article content.');
  } else if (values.content.length > MAX_CONTENT_LENGTH) {
    errors.push('The article is too long. Keep it under 300,000 characters.');
  }

  const content = values.content.trim() && values.content.length <= MAX_CONTENT_LENGTH
    ? sanitizeArticleHtml(values.content)
    : { html: '', headings: [], text: '', wordCount: 0, readingMinutes: 1 };

  if (values.content.trim() && !content.text && values.content.length <= MAX_CONTENT_LENGTH) {
    errors.push('Add some readable article content, not just empty formatting.');
  }

  if (errors.length) return { values, errors };

  const excerpt = values.excerpt || makeExcerpt(firstParagraphText(content.html) || content.text);

  return {
    values,
    errors,
    fields: {
      title: values.title,
      slug: values.slug || values.title,
      excerpt,
      content: content.html,
      headings: content.headings,
      wordCount: content.wordCount,
      readingMinutes: content.readingMinutes,
      category: values.category || 'Guides',
      author: values.author || 'Editorial Team',
      coverImage: values.coverImage,
      status: values.status
    }
  };
}

function byPublishedDate(a, b) {
  return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
}

function notFound(response) {
  return response.status(404).send(views.notFoundPage());
}

/**
 * The editor is open by default for local/demo use. Set ADMIN_PASSWORD in a
 * deployment to require HTTP Basic authentication for /admin.
 */
function adminAuth(request, response, next) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return next();

  const authorization = request.headers.authorization || '';
  const [scheme, encoded] = authorization.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const supplied = decoded.slice(decoded.indexOf(':') + 1);
    const expectedBuffer = Buffer.from(password);
    const suppliedBuffer = Buffer.from(supplied);

    if (
      expectedBuffer.length === suppliedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      return next();
    }
  }

  response.set('WWW-Authenticate', 'Basic realm="HR Assignment Help editor", charset="UTF-8"');
  response.status(401).send('Authentication required.');
}

/**
 * Browsers replay cached Basic credentials on cross-site form posts, so reject
 * state-changing admin requests that do not look same-origin.
 */
function blockCrossSiteRequests(request, response, next) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return next();
  }

  const fetchSite = request.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return response.status(403).send('Cross-site request blocked.');
  }

  const origin = request.get('origin');
  if (origin) {
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      return response.status(403).send('Cross-site request blocked.');
    }

    if (originHost !== request.get('host')) {
      return response.status(403).send('Cross-site request blocked.');
    }
  }

  return next();
}

module.exports = { createApp, preparePost, readForm };
