'use strict';

const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  'h2', 'h3', 'h4', 'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'del',
  'ul', 'ol', 'li', 'blockquote',
  'a', 'img', 'figure', 'figcaption',
  'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span'
];

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['scope', 'colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    div: ['class'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id']
  },
  allowedClasses: {
    div: ['table-wrap']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a(tagName, attribs) {
      const next = { ...attribs, rel: 'noopener noreferrer' };
      if (next.target !== '_blank') delete next.target;
      return { tagName, attribs: next };
    },
    div(tagName, attribs) {
      if (String(attribs.class || '').split(/\s+/).includes('table-wrap')) {
        return { tagName, attribs: { class: 'table-wrap' } };
      }
      // Contenteditable browsers insert divs for new paragraphs.
      return { tagName: 'p', attribs: {} };
    }
  }
};

/**
 * Cleans editor HTML and adds stable ids to h2/h3 headings so the article
 * page can build a table of contents.
 */
function sanitizeArticleHtml(input) {
  const html = sanitizeHtml(String(input || ''), SANITIZE_OPTIONS);
  const { html: withIds, headings } = addHeadingIds(html);
  const text = plainTextFromHtml(withIds);
  const wordCount = text ? text.split(/\s+/).length : 0;

  return {
    html: withIds,
    headings,
    text,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 200))
  };
}

function addHeadingIds(html) {
  const used = new Set();
  const headings = [];

  const output = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attributes, inner) => {
    const text = plainTextFromHtml(inner);
    if (!text) return match;

    const existing = /\bid\s*=\s*"([^"]+)"/i.exec(attributes);
    const base = existing && /^[A-Za-z0-9_-]+$/.test(existing[1]) ? existing[1] : slugify(text) || 'section';
    let id = base;
    let counter = 2;
    while (used.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    used.add(id);
    headings.push({ id, level: Number(level), text });

    const rest = attributes.replace(/\s*\bid\s*=\s*"[^"]*"/i, '');
    return `<h${level}${rest} id="${id}">${inner}</h${level}>`;
  });

  return { html: output, headings };
}

function firstParagraphText(html) {
  const match = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(String(html || ''));
  return match ? plainTextFromHtml(match[1]) : '';
}

function plainTextFromHtml(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'");
}

/** URL-safe slug, capped so links stay manageable. */
function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function uniqueSlug(posts, desired, exceptId) {
  const base = slugify(desired) || 'article';
  let candidate = base;
  let counter = 2;

  while (posts.some((post) => post.slug === candidate && post.id !== exceptId)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function makeExcerpt(text, maxLength = 200) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;

  const slice = clean.slice(0, maxLength + 1);
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = lastSpace > 100 ? slice.slice(0, lastSpace) : clean.slice(0, maxLength);
  return `${clipped.replace(/[,.;:]+$/, '')}\u2026`;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isAllowedImageUrl(value) {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  return isHttpUrl(value);
}

function formatDate(value, options = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: options.long ? 'long' : 'short',
    year: 'numeric'
  }).format(date);
}

function readingTime(html) {
  const text = plainTextFromHtml(html);
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function initials(name) {
  return String(name || 'Editorial Team')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

module.exports = {
  sanitizeArticleHtml,
  firstParagraphText,
  plainTextFromHtml,
  slugify,
  uniqueSlug,
  makeExcerpt,
  isHttpUrl,
  isAllowedImageUrl,
  formatDate,
  readingTime,
  initials
};
