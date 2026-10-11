/* Awesome Self-Driving Labs — progressive enhancement. Pages and paper records are static HTML. */
(() => {
  'use strict';
  // Copy only the fields the visitor filled out. This static website never uploads data.
  const submission = document.getElementById('paper-submission-form');
  if (submission) {
    const feedback = document.getElementById('submission-feedback');
    const manualCopy = document.getElementById('submission-manual-copy');
    const manualText = document.getElementById('submission-manual-text');

    const details = () => {
      const fields = Array.from(submission.querySelectorAll('input[name], select[name], textarea[name]'))
        .map(field => [field.name, field.value.trim()])
        .filter(([, value]) => value.length > 0);
      return fields.length
        ? 'Paper Contribution\n\n' + fields.map(([name, value]) => `${name}: ${value}`).join('\n')
        : '';
    };

    function legacyCopy(text) {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;opacity:0;';
      document.body.appendChild(helper);
      helper.focus();
      helper.select();
      helper.setSelectionRange(0, text.length);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (_) { /* Clipboard permission denied. */ }
      helper.remove();
      return copied;
    }

    async function copyDetails() {
      const text = details();
      manualCopy.hidden = true;
      if (!text) {
        feedback.textContent = 'Enter some paper details before copying.';
        return;
      }
      let copied = false;
      // HTTPS/localhost: modern clipboard. file:// and older browsers: legacy copy.
      if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); copied = true; }
        catch (_) { /* Try the fallback below. */ }
      }
      if (!copied) copied = legacyCopy(text);
      if (copied) {
        feedback.textContent = 'Copied to clipboard. Email the details to yumingfu@csu.edu.cn.';
      } else {
        manualText.value = text;
        manualCopy.hidden = false;
        manualText.focus();
        manualText.select();
        feedback.textContent = 'Automatic copying is blocked. Select the text below and copy it manually.';
      }
    }

    submission.addEventListener('submit', event => {
      event.preventDefault();
      copyDetails();
    });
  }
  const list = document.getElementById('paper-list');
  if (!list) return;
  const controls = {
    publication: document.getElementById('filter-publication'),
    category: document.getElementById('filter-category'),
    topic: document.getElementById('filter-topic'),
    domain: document.getElementById('filter-domain'),
    scope: document.getElementById('filter-scope'),
    year: document.getElementById('filter-year'),
    sort: document.getElementById('sort-papers')
  };
  const cards = Array.from(list.querySelectorAll('.paper-card'));
  const pageSize = 12;
  let page = 1;
  const count = document.getElementById('results-count');
  const pills = document.getElementById('active-filters');
  const empty = document.getElementById('empty-state');
  const bar = document.querySelector('.pagination-bar');
  const pageLabel = document.getElementById('page-label');
  const prev = document.getElementById('prev-page');
  const next = document.getElementById('next-page');
  const defaults = ['publication', 'category', 'topic', 'domain', 'scope', 'year', 'sort'];
  const params = new URLSearchParams(location.search);
  defaults.forEach(key => {
    const value = params.get(key);
    if (value && Array.from(controls[key].options).some(o => o.value === value)) controls[key].value = value;
  });
  const preferredPage = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  page = preferredPage;
  function matches(card) {
    const d = card.dataset;
    const publication = controls.publication.value;
    return (!publication || (publication.startsWith('group:') ? d.publicationGroup === publication.slice(6) : d.publication === publication.slice(6))) &&
      (!controls.category.value || d.category === controls.category.value) &&
      (!controls.topic.value || d.topics.split('|').includes(controls.topic.value)) &&
      (!controls.domain.value || d.domains.split('|').includes(controls.domain.value)) &&
      (!controls.scope.value || d.scope === controls.scope.value) &&
      (!controls.year.value || d.year === controls.year.value);
  }
  function dateRank(card) { return card.dataset.date || card.dataset.year || '0'; }
  function compare(a, b) {
    const sort = controls.sort.value;
    if (sort === 'oldest') return dateRank(a).localeCompare(dateRank(b));
    if (sort === 'added') return b.dataset.added.localeCompare(a.dataset.added) || dateRank(b).localeCompare(dateRank(a));
    if (sort === 'value') return Number(b.dataset.value) - Number(a.dataset.value) || dateRank(b).localeCompare(dateRank(a));
    return dateRank(b).localeCompare(dateRank(a));
  }
  function update(push) {
    const filtered = cards.filter(matches).sort(compare);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(Math.max(page, 1), totalPages);
    const current = filtered.slice((page - 1) * pageSize, page * pageSize);
    // DOM nodes already contain properly escaped, static content.
    list.replaceChildren(...current);
    count.textContent = filtered.length;
    empty.hidden = filtered.length !== 0;
    bar.hidden = filtered.length <= pageSize;
    pageLabel.textContent = `Page ${page} of ${totalPages}`;
    prev.disabled = page === 1;
    next.disabled = page === totalPages;
    pills.replaceChildren();
    defaults.filter(k => k !== 'sort').forEach(key => {
      if (!controls[key].value) return;
      const pill = document.createElement('span');
      pill.textContent = controls[key].selectedOptions[0].textContent;
      pills.appendChild(pill);
    });
    pills.hidden = pills.children.length === 0;
    const nextParams = new URLSearchParams();
    defaults.forEach(key => {
      if (controls[key].value && !(key === 'sort' && controls[key].value === 'newest'))
        nextParams.set(key, controls[key].value);
    });
    if (page > 1) nextParams.set('page', String(page));
    const address = location.pathname + (nextParams.size ? '?' + nextParams.toString() : '') + location.hash;
    if (push) { try { history.replaceState({}, '', address); } catch (_) { /* Some file:// browsers restrict History API. Filtering still works. */ } }
  }
  function reset() {
    Object.values(controls).forEach(control => { control.value = control.id === 'sort-papers' ? 'newest' : ''; });
    page = 1;
    update(true);
  }
  Object.values(controls).forEach(c => c.addEventListener('change', () => { page = 1; update(true); }));
  document.getElementById('reset-filters').addEventListener('click', reset);
  document.getElementById('empty-reset').addEventListener('click', reset);
  prev.addEventListener('click', () => { page--; update(true); document.getElementById('browser').scrollIntoView({ behavior: 'smooth' }); });
  next.addEventListener('click', () => { page++; update(true); document.getElementById('browser').scrollIntoView({ behavior: 'smooth' }); });
  update(false);
})();
