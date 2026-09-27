(() => {
  'use strict';

  /* =========================================================
     Storage helpers (never let a blocked/throwing storage API
     break the app — everything falls back gracefully)
     ========================================================= */
  function safeGet(store, key) {
    try { return store.getItem(key); } catch (e) { return null; }
  }
  function safeSet(store, key, value) {
    try { store.setItem(key, value); } catch (e) { /* ignore */ }
  }
  function safeRemove(store, key) {
    try { store.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* =========================================================
     Auth
     ========================================================= */
  const CREDENTIALS = { username: 'ASWATHY', password: 'HARI' };
  const AUTH_KEY = 'grocery.authed';

  const loginScreen = document.getElementById('login-screen');
  const appRoot = document.getElementById('app');
  const loginForm = document.getElementById('login-form');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');

  let isAuthed = safeGet(sessionStorage, AUTH_KEY) === '1';

  function showApp() { loginScreen.hidden = true; appRoot.hidden = false; }
  function showLogin() {
    appRoot.hidden = true;
    loginScreen.hidden = false;
    loginUsername.value = '';
    loginPassword.value = '';
    loginError.hidden = true;
    loginUsername.focus();
  }

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const ok = loginUsername.value.trim() === CREDENTIALS.username && loginPassword.value === CREDENTIALS.password;
    if (ok) {
      isAuthed = true;
      safeSet(sessionStorage, AUTH_KEY, '1');
      showApp();
      init();
    } else {
      loginError.hidden = false;
      loginPassword.value = '';
      loginPassword.focus();
    }
  });

  isAuthed ? showApp() : showLogin();

  /* =========================================================
     Theme
     ========================================================= */
  const THEME_KEY = 'grocery.theme';
  const themeBtn = document.getElementById('themeBtn');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function applyTheme(theme) {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    themeBtn.textContent = theme === 'light' ? '☀️ Light' : '🌙 Dark';
  }
  themeBtn.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    safeSet(localStorage, THEME_KEY, next);
  });
  applyTheme(currentTheme()); // sync label; <head> script already set the attribute pre-paint

  const signOutBtn = document.getElementById('signOutBtn');
  signOutBtn.addEventListener('click', () => {
    isAuthed = false;
    safeRemove(sessionStorage, AUTH_KEY);
    clearAllTimers();
    showLogin();
  });

  /* =========================================================
     Data model + persistence
     ========================================================= */
  const STORAGE_KEY = 'grocery.state.v2';
  const LISTS = ['Grocery List', 'Costco List'];

  const BUILT_IN_CATEGORIES = {
    'Produce': ['apple','apples','banana','bananas','berry','berries','spinach','lettuce','tomato','tomatoes','potato','potatoes','onion','onions','garlic','carrot','carrots','avocado','lemon','lime','cucumber','grape','grapes','broccoli','pepper','mushroom','ginger','fruit','vegetable'],
    'Dairy': ['milk','cheese','butter','yogurt','yoghurt','cream','egg','eggs','paneer'],
    'Bakery': ['bread','puff pastry','croissant','bagel','bun','buns','muffin','cake','pita'],
    'Meat & Seafood': ['chicken','beef','pork','lamb','salmon','fish','shrimp','prawns','bacon','turkey','mince','steak'],
    'Snacks': ['chips','chocolate','popcorn','nuts','biscuit','biscuits','crackers','cookie','cookies','candy'],
    'Drinks': ['juice','soda','coke','water','coffee','tea','sparkling water','energy drink'],
    'Frozen': ['ice cream','frozen peas','pizza','frozen berries','nuggets'],
    'Household': ['paper towel','toilet paper','trash bags','sponge','cleaner'],
    'Pantry': ['rice','pasta','olive oil','flour','sugar','salt','pepper','sauce','cereal','oats','canned beans','chickpeas'],
    'Indian Store': ['atta','basmati','ghee','masala','turmeric','paneer','roti','naan']
  };

  function emptyState() {
    const listsData = {};
    LISTS.forEach(name => { listsData[name] = { items: [] }; });
    return { activeList: 'Grocery List', listsData, learned: {} };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      const fresh = emptyState();
      const listsData = {};
      LISTS.forEach(name => {
        const saved = parsed.listsData && parsed.listsData[name];
        listsData[name] = (saved && Array.isArray(saved.items)) ? saved : fresh.listsData[name];
      });
      return {
        activeList: (parsed.activeList && listsData[parsed.activeList]) ? parsed.activeList : 'Grocery List',
        listsData,
        learned: (parsed.learned && typeof parsed.learned === 'object') ? parsed.learned : {}
      };
    } catch (e) {
      console.warn('Could not read saved data — starting fresh.', e);
      return emptyState();
    }
  }

  let state = loadState();
  function saveState() { safeSet(localStorage, STORAGE_KEY, JSON.stringify(state)); }
  function activeItems() { return state.listsData[state.activeList].items; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* =========================================================
     Category suggestion + learning
     ========================================================= */
  function suggestCategory(rawName) {
    const q = rawName.trim().toLowerCase();
    if (!q) return null;

    let best = null, bestLen = 0;
    for (const key in state.learned) {
      if (q.includes(key) && key.length > bestLen) { best = state.learned[key]; bestLen = key.length; }
    }
    if (best) return best;

    for (const [category, keywords] of Object.entries(BUILT_IN_CATEGORIES)) {
      for (const kw of keywords) {
        if (q.includes(kw) && kw.length > bestLen) { best = category; bestLen = kw.length; }
      }
    }
    return best;
  }

  function learn(name, category) {
    const key = name.trim().toLowerCase();
    if (key && category) state.learned[key] = category;
  }

  function knownCategories() {
    const set = new Set(Object.keys(BUILT_IN_CATEGORIES));
    LISTS.forEach(name => state.listsData[name].items.forEach(i => set.add(i.category)));
    Object.values(state.learned).forEach(c => set.add(c));
    return [...set].sort();
  }

  /* =========================================================
     Undo / redo (snapshots the list data only)
     ========================================================= */
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 50;
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  function snapshot() { return JSON.stringify(state.listsData); }
  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    syncUndoRedoButtons();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    state.listsData = JSON.parse(undoStack.pop());
    clearAllTimers();
    resumeTimers();
    saveState();
    renderAll();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    state.listsData = JSON.parse(redoStack.pop());
    clearAllTimers();
    resumeTimers();
    saveState();
    renderAll();
  }
  function syncUndoRedoButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  }
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  /* =========================================================
     Purchased-item countdown (independent per item, survives refresh)
     ========================================================= */
  const REMOVAL_MS = 60 * 1000;
  const timers = new Map();

  function clearTimer(id) {
    const h = timers.get(id);
    if (h) { clearTimeout(h); timers.delete(id); }
  }
  function clearAllTimers() { timers.forEach(h => clearTimeout(h)); timers.clear(); }

  function findItem(id) {
    for (const listName of LISTS) {
      const item = state.listsData[listName].items.find(i => i.id === id);
      if (item) return item;
    }
    return null;
  }

  function scheduleRemoval(item) {
    clearTimer(item.id);
    if (!item.purchased || !item.purchasedAt || item.removed) return;
    const remaining = REMOVAL_MS - (Date.now() - item.purchasedAt);
    if (remaining <= 0) { finalizeRemoval(item.id); return; }
    timers.set(item.id, setTimeout(() => finalizeRemoval(item.id), remaining));
  }

  function finalizeRemoval(id) {
    clearTimer(id);
    const item = findItem(id);
    if (!item || item.removed) return;
    pushUndo();
    item.removed = true;
    saveState();
    renderAll();
  }

  function resumeTimers() {
    LISTS.forEach(name => {
      state.listsData[name].items.forEach(item => {
        if (item.purchased && item.purchasedAt && !item.removed) scheduleRemoval(item);
      });
    });
  }

  /* =========================================================
     DOM references
     ========================================================= */
  const listNav = document.getElementById('listNav');
  const pageTitle = document.getElementById('pageTitle');
  const pageSummary = document.getElementById('pageSummary');

  const tabButtons = {
    list: document.getElementById('tabList'),
    add: document.getElementById('tabAdd'),
    removed: document.getElementById('tabRemoved')
  };
  const views = {
    list: document.getElementById('view-list'),
    add: document.getElementById('view-add'),
    removed: document.getElementById('view-removed')
  };
  const countActive = document.getElementById('countActive');
  const countRemoved = document.getElementById('countRemoved');

  const addForm = document.getElementById('addForm');
  const itemName = document.getElementById('itemName');
  const categoryInput = document.getElementById('categoryInput');
  const categoryOptions = document.getElementById('categoryOptions');
  const suggestionHint = document.getElementById('suggestionHint');
  const quantityInput = document.getElementById('quantityInput');
  const unitInput = document.getElementById('unitInput');

  const searchInput = document.getElementById('searchInput');
  const listGroups = document.getElementById('listGroups');
  const removedGroups = document.getElementById('removedGroups');

  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  let currentView = 'add';
  let categoryEditedByUser = false;

  /* =========================================================
     Sidebar (list switcher)
     ========================================================= */
  function renderSidebar() {
    listNav.innerHTML = '';
    LISTS.forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-btn' + (name === state.activeList ? ' active' : '');
      btn.textContent = name;
      btn.addEventListener('click', () => {
        state.activeList = name;
        saveState();
        renderAll();
      });
      listNav.appendChild(btn);
    });
  }

  /* =========================================================
     View tabs
     ========================================================= */
  function setView(view) {
    currentView = view;
    Object.keys(views).forEach(key => {
      views[key].classList.toggle('active', key === view);
      tabButtons[key].classList.toggle('active', key === view);
    });
  }
  tabButtons.list.addEventListener('click', () => setView('list'));
  tabButtons.add.addEventListener('click', () => setView('add'));
  tabButtons.removed.addEventListener('click', () => setView('removed'));

  /* =========================================================
     Add-item form
     ========================================================= */
  function renderCategoryOptions() {
    categoryOptions.innerHTML = '';
    knownCategories().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      categoryOptions.appendChild(opt);
    });
  }

  itemName.addEventListener('input', () => {
    if (categoryEditedByUser) return;
    const suggestion = suggestCategory(itemName.value);
    if (suggestion) {
      categoryInput.value = suggestion;
      suggestionHint.innerHTML = `Suggested: <strong>${escapeHtml(suggestion)}</strong> — change it anytime`;
      suggestionHint.hidden = false;
    } else {
      suggestionHint.hidden = true;
    }
  });

  categoryInput.addEventListener('input', () => {
    categoryEditedByUser = true;
    suggestionHint.hidden = true;
  });

  addForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = itemName.value.trim();
    if (!name) {
      itemName.classList.add('invalid');
      itemName.focus();
      setTimeout(() => itemName.classList.remove('invalid'), 1200);
      return;
    }
    const category = categoryInput.value.trim() || 'Uncategorised';
    const qty = Math.max(1, parseInt(quantityInput.value, 10) || 1);
    const unit = unitInput.value || 'pcs';

    pushUndo();
    activeItems().push({
      id: uid(), name, category, quantity: qty, unit,
      purchased: false, purchasedAt: null, removed: false, createdAt: Date.now()
    });
    learn(name, category);
    saveState();

    itemName.value = '';
    categoryInput.value = '';
    quantityInput.value = '1';
    categoryEditedByUser = false;
    suggestionHint.hidden = true;
    renderAll();
    showToast(`Added "${name}" to ${category}`);
    setView('list');
    itemName.focus();
  });

  /* =========================================================
     Rendering: active list + removed list
     ========================================================= */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildRow(item, { removedView }) {
    const row = document.createElement('div');
    row.className = 'row' + (item.purchased ? ' purchased' : '');
    row.dataset.id = item.id;

    const checkboxHtml = removedView ? '' : `
      <label class="checkbox">
        <input type="checkbox" data-action="toggle" ${item.purchased ? 'checked' : ''} />
        <span class="checkmark"></span>
      </label>`;

    let timerHtml = '';
    if (item.purchased && item.purchasedAt && !item.removed) {
      const expiresAt = item.purchasedAt + REMOVAL_MS;
      const secondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      timerHtml = `<span class="row-timer" data-expires-at="${expiresAt}">${secondsLeft > 0 ? `Removing in ${secondsLeft}s` : 'Removing…'}</span>`;
    }

    const actionHtml = removedView
      ? `<button type="button" class="row-action restore" data-action="restore" title="Restore">↺</button>`
      : `<button type="button" class="row-action" data-action="delete" title="Remove">🗑</button>`;

    row.innerHTML = `
      ${checkboxHtml}
      <div class="row-info">
        <span class="row-name">${escapeHtml(item.name)}</span>
        <span class="row-meta">${item.quantity} ${escapeHtml(item.unit)}</span>
        <span class="row-meta">${escapeHtml(item.category)}</span>
        ${timerHtml}
      </div>
      ${actionHtml}
    `;
    return row;
  }

  function groupByCategory(items) {
    const map = {};
    items.forEach(i => { (map[i.category] ||= []).push(i); });
    return map;
  }

  function renderList() {
    const term = searchInput.value.trim().toLowerCase();
    let items = activeItems().filter(i => !i.removed);
    if (term) items = items.filter(i => i.name.toLowerCase().includes(term));

    listGroups.innerHTML = '';
    if (items.length === 0) {
      listGroups.innerHTML = `<p class="empty">No items yet. Use the Add item tab to get started.</p>`;
      return;
    }

    const groups = groupByCategory(items);
    Object.keys(groups).sort().forEach(cat => {
      const section = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'group-title';
      title.textContent = cat;
      const rows = document.createElement('div');
      rows.className = 'rows';
      groups[cat]
        .sort((a, b) => (a.purchased === b.purchased) ? a.createdAt - b.createdAt : (a.purchased ? 1 : -1))
        .forEach(item => rows.appendChild(buildRow(item, { removedView: false })));
      section.append(title, rows);
      listGroups.appendChild(section);
    });
  }

  function renderRemoved() {
    const items = activeItems().filter(i => i.removed);
    removedGroups.innerHTML = '';
    if (items.length === 0) {
      removedGroups.innerHTML = `<p class="empty">Nothing removed yet.</p>`;
      return;
    }
    const rows = document.createElement('div');
    rows.className = 'rows';
    items
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach(item => rows.appendChild(buildRow(item, { removedView: true })));
    removedGroups.appendChild(rows);
  }

  listGroups.addEventListener('change', e => {
    if (e.target.dataset.action !== 'toggle') return;
    const id = e.target.closest('.row').dataset.id;
    const item = activeItems().find(i => i.id === id);
    if (!item) return;

    pushUndo();
    item.purchased = e.target.checked;
    if (item.purchased) {
      item.purchasedAt = Date.now();
      saveState();
      renderAll();
      scheduleRemoval(item);
    } else {
      item.purchasedAt = null;
      clearTimer(item.id);
      saveState();
      renderAll();
    }
  });

  listGroups.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="delete"]');
    if (!btn) return;
    const id = btn.closest('.row').dataset.id;
    const item = activeItems().find(i => i.id === id);
    if (!item) return;
    pushUndo();
    clearTimer(item.id);
    item.removed = true;
    saveState();
    renderAll();
  });

  removedGroups.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="restore"]');
    if (!btn) return;
    const id = btn.closest('.row').dataset.id;
    const item = activeItems().find(i => i.id === id);
    if (!item) return;
    pushUndo();
    item.removed = false;
    item.purchased = false;
    item.purchasedAt = null;
    clearTimer(item.id);
    saveState();
    renderAll();
  });

  searchInput.addEventListener('input', renderList);

  // Cosmetic per-second tick for visible countdowns — never touches state.
  setInterval(() => {
    document.querySelectorAll('.row-timer').forEach(el => {
      const secondsLeft = Math.max(0, Math.ceil((Number(el.dataset.expiresAt) - Date.now()) / 1000));
      el.textContent = secondsLeft > 0 ? `Removing in ${secondsLeft}s` : 'Removing…';
    });
  }, 1000);

  /* =========================================================
     Header summary + top-level render
     ========================================================= */
  function renderHeader() {
    pageTitle.textContent = state.activeList;
    const items = activeItems().filter(i => !i.removed);
    const purchased = items.filter(i => i.purchased).length;
    const categories = new Set(items.map(i => i.category)).size;
    pageSummary.textContent = items.length
      ? `${items.length} item${items.length === 1 ? '' : 's'} · ${purchased} purchased · ${categories} categor${categories === 1 ? 'y' : 'ies'}`
      : 'Nothing on this list yet';
    countActive.textContent = items.length;
    countRemoved.textContent = activeItems().filter(i => i.removed).length;
  }

  function renderAll() {
    renderSidebar();
    renderHeader();
    renderCategoryOptions();
    renderList();
    renderRemoved();
    syncUndoRedoButtons();
  }

  /* =========================================================
     Init
     ========================================================= */
  let started = false;
  function init() {
    if (started) return;
    started = true;
    resumeTimers();
    setView('add');
    renderAll();
  }

  if (isAuthed) init();
})();
