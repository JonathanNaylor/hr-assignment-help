'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const { uniqueSlug } = require('./content');

/**
 * A tiny JSON-backed article store. The whole collection is kept in memory
 * and written atomically, which is plenty for a single-editor blog and avoids
 * a database dependency.
 */
class PostStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.posts = [];
    this.writeQueue = Promise.resolve();
    this.ready = this.load();
  }

  async load() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Article data must be a JSON array.');
      }
      this.posts = parsed;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      this.posts = [];
      await this.write();
    }
  }

  async all() {
    await this.ready;
    return this.posts.map((post) => ({ ...post }));
  }

  async findById(id) {
    await this.ready;
    const post = this.posts.find((item) => item.id === id);
    return post ? { ...post } : null;
  }

  async findBySlug(slug) {
    await this.ready;
    const post = this.posts.find((item) => item.slug === slug);
    return post ? { ...post } : null;
  }

  async create(fields) {
    await this.ready;
    const now = new Date().toISOString();
    const post = {
      ...fields,
      slug: uniqueSlug(this.posts, fields.slug || fields.title),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      publishedAt: fields.status === 'published' ? now : null
    };

    this.posts.unshift(post);
    await this.write();
    return { ...post };
  }

  async update(id, fields) {
    await this.ready;
    const post = this.posts.find((item) => item.id === id);
    if (!post) return null;

    Object.assign(post, fields, {
      slug: uniqueSlug(this.posts, fields.slug || fields.title, id),
      updatedAt: new Date().toISOString()
    });
    await this.write();
    return { ...post };
  }

  async remove(id) {
    await this.ready;
    const index = this.posts.findIndex((item) => item.id === id);
    if (index === -1) return false;

    this.posts.splice(index, 1);
    await this.write();
    return true;
  }

  write() {
    const snapshot = `${JSON.stringify(this.posts, null, 2)}\n`;
    const filePath = this.filePath;
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    const run = async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(tempPath, snapshot, 'utf8');
      await fs.rename(tempPath, filePath);
    };

    // Chain writes so concurrent saves always leave the newest snapshot last.
    this.writeQueue = this.writeQueue.then(run, run);
    return this.writeQueue;
  }
}

module.exports = { PostStore };
