# HR Assignment Help — Blog

A small, dependency-light blog built with Node.js and Express. It includes a
full article editor with a formatting toolbar, an HTML mode, drafts, and
create / edit / delete workflows. The original static HR assignment article is
included as the first post.

Requires Node.js 22.12 or newer.

## Run it

```bash
npm install
npm start
```

Open <http://localhost:3000>. The editorial dashboard is at
<http://localhost:3000/admin>.

For development with automatic restarts:

```bash
npm run dev
```

## Tests

```bash
npm test
```

The tests start the app on an ephemeral port and exercise publishing, drafts,
updating, deleting, validation, XSS sanitization, heading IDs, duplicate
slugs and cross-site request protection.

## Editing

From `/admin` you can:

- create an article with **New article**;
- write and format content in the visual **Write** tab, or edit the underlying
  HTML in the **HTML** tab;
- set a category, author, summary, cover image, URL slug and draft/published
  status;
- update any article with **Edit**;
- remove an article with **Delete** (with a confirmation prompt).

Published articles appear on the home page and at `/posts/:slug`. Drafts are
only visible in the editor. The editor sanitizes saved HTML with an allowlist,
so scripts, event handlers and unsafe URLs are removed even if pasted in.

## Data

Articles are stored in `data/posts.json`. It is read into memory at startup and
written atomically after each change, so back up that file if you want to keep
your content. The location can be overridden with the `DATA_FILE` environment
variable.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Listen address |
| `DATA_FILE` | `data/posts.json` | JSON article store |
| `ADMIN_PASSWORD` | unset | When set, `/admin` requires HTTP Basic authentication |

The editor is open by default so the demo works out of the box. If you deploy
this publicly, set `ADMIN_PASSWORD` and serve the site over HTTPS, or put the
editor behind your platform's authentication. This is intentionally a small
single-editor app; there are no user accounts.

## Structure

```
app.js              Express routes, validation and admin authentication
server.js           HTTP server entry point
src/content.js      Sanitizing, slugs, excerpts, reading time
src/posts-store.js  Atomic JSON-backed article store
src/views.js        Server-rendered HTML templates
public/site.css     Site, article, dashboard and editor styles
public/site.js      Contents highlighting and delete confirmation
public/editor.js    Rich text toolbar, HTML mode, word count and autoslug
public/images/      Local cover artwork
data/posts.json     Seed article and saved content
test/app.test.js    Node test runner integration tests
```

No build step or frontend framework is required.
