'use strict';

(() => {
  const form = document.getElementById('article-form');
  const surface = document.getElementById('editor-surface');
  const source = document.getElementById('content');
  if (!form || !surface || !source) return;

  const toolbar = document.getElementById('editor-toolbar');
  const formatSelect = document.getElementById('block-format');
  const modeButtons = [...document.querySelectorAll('.editor-mode')];
  const stats = document.getElementById('editor-stats');
  const titleInput = document.getElementById('title');
  const slugInput = document.querySelector('[data-slug-input]');
  const isNew = form.getAttribute('action') === '/admin/posts';

  let mode = 'write';
  let slugTouched = Boolean(slugInput?.value);

  surface.innerHTML = source.value;
  updateStats();

  function syncFromSurface() {
    if (mode === 'write') source.value = surface.innerHTML;
  }

  function currentHtml() {
    return mode === 'html' ? source.value : surface.innerHTML;
  }

  function updateStats() {
    const text = currentHtml()
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = text ? text.split(' ').length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    stats.textContent = `${words} ${words === 1 ? 'word' : 'words'} \u00b7 ${minutes} min read`;
  }

  function setMode(nextMode) {
    if (nextMode === mode) return;

    if (mode === 'write') syncFromSurface();
    mode = nextMode;

    if (mode === 'html') {
      surface.hidden = true;
      toolbar.hidden = true;
      source.hidden = false;
      source.focus();
    } else {
      surface.innerHTML = source.value;
      source.hidden = true;
      toolbar.hidden = false;
      surface.hidden = false;
      surface.focus();
    }

    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });

    updateStats();
  }

  function runCommand(command, value = null) {
    surface.focus();
    document.execCommand(command, false, value);
    syncFromSurface();
    updateStats();
    updateToolbarState();
  }

  function safeUrl(raw, protocols = ['http:', 'https:', 'mailto:']) {
    try {
      const url = new URL(raw);
      return protocols.includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function insertLink() {
    const raw = window.prompt('Link URL', 'https://');
    if (!raw) return;

    const url = safeUrl(raw);
    if (!url) {
      window.alert('Enter an http(s) or mailto link.');
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      runCommand('createLink', url);
    } else {
      runCommand(
        'insertHTML',
        `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeAttribute(url)}</a>`
      );
    }
  }

  function insertImage() {
    const raw = window.prompt('Image URL', 'https://');
    if (!raw) return;

    const url = safeUrl(raw, ['http:', 'https:']);
    if (!url) {
      window.alert('Enter an http(s) image URL.');
      return;
    }

    const alt = window.prompt('Image description (optional)', '') || '';
    runCommand(
      'insertHTML',
      `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" loading="lazy">`
    );
  }

  function updateToolbarState() {
    if (mode !== 'write') return;

    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !surface.contains(selection.anchorNode)) return;

    ['bold', 'italic', 'underline'].forEach((command) => {
      const button = toolbar.querySelector(`[data-command="${command}"]`);
      if (button) button.classList.toggle('is-active', document.queryCommandState(command));
    });

    const block = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
    formatSelect.value = ['h2', 'h3', 'blockquote'].includes(block) ? block : 'p';
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  toolbar.addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) event.preventDefault();
  });

  toolbar.querySelectorAll('button[data-command]').forEach((button) => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      if (command === 'link') return insertLink();
      if (command === 'image') return insertImage();
      return runCommand(command);
    });
  });

  formatSelect.addEventListener('change', () => {
    runCommand('formatBlock', `<${formatSelect.value}>`);
  });

  surface.addEventListener('input', updateStats);
  source.addEventListener('input', updateStats);
  document.addEventListener('selectionchange', updateToolbarState);

  surface.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      insertLink();
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      syncFromSurface();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', syncFromSurface);

  if (isNew && titleInput && slugInput) {
    titleInput.addEventListener('input', () => {
      if (slugTouched) return;
      slugInput.value = titleInput.value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['\u2019]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '');
    });

    slugInput.addEventListener('input', () => {
      slugTouched = true;
    });
  }
})();
