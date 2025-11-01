const state = {
  allCourses: [],
  filteredCourses: [],
  favorites: new Set(),
};

const els = {
  year: null,
  search: null,
  clearSearch: null,
  category: null,
  level: null,
  type: null,
  reset: null,
  courseGrid: null,
  favoritesGrid: null,
  summary: null,
  toast: null,
  shareSite: null,
};

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function saveFavorites() {
  try { localStorage.setItem('slh:favorites', JSON.stringify([...state.favorites])); } catch {}
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem('slh:favorites');
    if (raw) { state.favorites = new Set(JSON.parse(raw)); }
  } catch {}
}

function badge(text) {
  const span = document.createElement('span');
  span.className = 'pill';
  span.textContent = text;
  return span;
}

function actionButton(text, opts = {}) {
  const btn = document.createElement('button');
  btn.className = `btn ${opts.variant || ''}`.trim();
  btn.type = 'button';
  btn.textContent = text;
  if (opts.title) btn.title = opts.title;
  return btn;
}

function anchorButton(text, href) {
  const a = document.createElement('a');
  a.className = 'btn';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

function createCard(course) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', `${course.title} from ${course.provider}`);

  const head = document.createElement('div');
  head.className = 'card-head';
  const b = document.createElement('span');
  b.className = 'badge';
  b.textContent = course.provider;
  head.appendChild(b);
  card.appendChild(head);

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = course.title;
  card.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = course.description;
  card.appendChild(desc);

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.append(
    badge(course.category),
    badge(course.type),
    badge(course.level.charAt(0).toUpperCase() + course.level.slice(1)),
  );
  card.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const visit = anchorButton('Visit', course.url);
  const fav = actionButton(state.favorites.has(course.url) ? 'Unfavorite' : 'Favorite', { variant: 'outline', title: 'Toggle favorite' });
  const share = actionButton('Share', { variant: 'secondary', title: 'Share or copy link' });

  visit.addEventListener('click', () => {
    // nothing extra
  });

  fav.addEventListener('click', () => {
    if (state.favorites.has(course.url)) {
      state.favorites.delete(course.url);
      fav.textContent = 'Favorite';
      showToast('Removed from favorites');
    } else {
      state.favorites.add(course.url);
      fav.textContent = 'Unfavorite';
      showToast('Added to favorites');
    }
    saveFavorites();
    renderFavorites();
  });

  share.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, text: course.description, url: course.url });
      } else {
        await navigator.clipboard.writeText(`${course.title} ? ${course.url}`);
        showToast('Link copied to clipboard');
      }
    } catch {
      // ignore
    }
  });

  actions.append(visit, fav, share);
  card.appendChild(actions);
  return card;
}

function renderCourses() {
  const grid = els.courseGrid;
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = '';

  if (state.filteredCourses.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No matching courses. Try different keywords or filters.';
    grid.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();
    state.filteredCourses.forEach(course => fragment.appendChild(createCard(course)));
    grid.appendChild(fragment);
  }

  els.summary.textContent = `${state.filteredCourses.length} result${state.filteredCourses.length === 1 ? '' : 's'} shown`;
  grid.removeAttribute('aria-busy');
}

function renderFavorites() {
  const grid = els.favoritesGrid;
  grid.innerHTML = '';
  const favs = state.allCourses.filter(c => state.favorites.has(c.url));
  if (favs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No favorites yet. Click ?Favorite? on any course to save it here.';
    grid.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();
    favs.forEach(course => fragment.appendChild(createCard(course)));
    grid.appendChild(fragment);
  }
}

function normalize(text) {
  return (text || '').toLowerCase();
}

function applyFilters() {
  const q = normalize(els.search.value);
  const cat = els.category.value;
  const lvl = els.level.value;
  const typ = els.type.value;

  state.filteredCourses = state.allCourses.filter(c => {
    const hit = normalize(`${c.title} ${c.description} ${c.provider} ${c.category}`).includes(q);
    const catPass = cat === 'all' || c.category === cat;
    const lvlPass = lvl === 'all' || c.level === lvl;
    const typPass = typ === 'all' || c.type === typ;
    return hit && catPass && lvlPass && typPass;
  });

  renderCourses();
}

function populateCategoryFilter() {
  const unique = [...new Set(state.allCourses.map(c => c.category))].sort();
  for (const cat of unique) {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    els.category.appendChild(opt);
  }
}

async function loadCourses() {
  const resp = await fetch('/courses.json');
  const data = await resp.json();
  state.allCourses = data.courses;
  state.filteredCourses = data.courses;
  populateCategoryFilter();
  renderCourses();
  renderFavorites();
}

function bindEvents() {
  els.search.addEventListener('input', applyFilters);
  els.clearSearch.addEventListener('click', () => { els.search.value = ''; applyFilters(); });
  els.category.addEventListener('change', applyFilters);
  els.level.addEventListener('change', applyFilters);
  els.type.addEventListener('change', applyFilters);
  els.reset.addEventListener('click', () => {
    els.search.value = '';
    els.category.value = 'all';
    els.level.value = 'all';
    els.type.value = 'all';
    applyFilters();
  });

  els.shareSite.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Student Learning Hub', text: 'Curated courses and learning links', url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Site URL copied');
      }
    } catch {}
  });
}

function init() {
  els.year = document.getElementById('year');
  els.search = document.getElementById('searchInput');
  els.clearSearch = document.getElementById('clearSearch');
  els.category = document.getElementById('categoryFilter');
  els.level = document.getElementById('levelFilter');
  els.type = document.getElementById('typeFilter');
  els.reset = document.getElementById('resetFilters');
  els.courseGrid = document.getElementById('courseGrid');
  els.favoritesGrid = document.getElementById('favoritesGrid');
  els.summary = document.getElementById('resultsSummary');
  els.toast = document.getElementById('toast');
  els.shareSite = document.getElementById('shareSite');

  const now = new Date();
  if (els.year) els.year.textContent = now.getFullYear();

  loadFavorites();
  bindEvents();
  loadCourses();
}

document.addEventListener('DOMContentLoaded', init);
