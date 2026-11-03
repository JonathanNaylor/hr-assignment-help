'use strict';

// Confirm destructive actions before the form is submitted.
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.confirm) return;
  if (!window.confirm(form.dataset.confirm)) {
    event.preventDefault();
  }
});

// Highlight the section currently in view in the article contents menu.
(() => {
  const links = [...document.querySelectorAll('.toc-link[href^="#"]')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = new Map(links.map((link) => [decodeURIComponent(link.hash.slice(1)), link]));
  const sections = [...byId.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((link) => link.removeAttribute('aria-current'));
    byId.get(id)?.setAttribute('aria-current', 'true');
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    if (visible[0]) setActive(visible[0].target.id);
  }, {
    rootMargin: '-96px 0px -65% 0px',
    threshold: 0
  });

  sections.forEach((section) => observer.observe(section));
})();
