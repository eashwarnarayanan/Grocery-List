(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyC7H4Z4SHfPfaZXJdMeAKG9szDg2KUdBpo",
    authDomain: "grocery-list-5533e.firebaseapp.com",
    databaseURL: "https://grocery-list-5533e-default-rtdb.firebaseio.com",
    projectId: "grocery-list-5533e",
    storageBucket: "grocery-list-5533e.firebasestorage.app",
    messagingSenderId: "429534628995",
    appId: "1:429534628995:web:767785da715af59f9edfb6",
    measurementId: "G-E7DTWVW0DE"
  };

  let firebaseDb = null;
  let firebaseListener = null;

  if (window.firebase) {
    const app = window.firebase.initializeApp(firebaseConfig);
    firebaseDb = window.firebase.database(app);
  }

  function safeGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function safeSet(store, key, value) { try { store.setItem(key, value); } catch (e) { } }
  function safeRemove(store, key) { try { store.removeItem(key); } catch (e) { } }

  const CREDENTIALS = { username: 'ASWATHY', password: 'HARI' };
  const AUTH_KEY = 'grocery.authed.user';

  const loginScreen = document.getElementById('loginScreen');
  const appRoot = document.getElementById('appRoot');
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const signOutBtn = document.getElementById('signOutBtn');

  let currentUser = null;

  function showApp() { loginScreen.style.display = 'none'; appRoot.style.display = 'flex'; }
  function showLogin() {
    appRoot.style.display = 'none';
    loginScreen.style.display = 'flex';
    loginUsername.value = '';
    loginPassword.value = '';
    loginError.style.display = 'none';
    loginUsername.focus();
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = loginUsername.value.trim();
    const pass = loginPassword.value;

    if (user === CREDENTIALS.username && pass === CREDENTIALS.password) {
      currentUser = user;
      safeSet(localStorage, AUTH_KEY, user);
      showApp();
      init();
    } else {
      loginError.style.display = 'block';
      loginPassword.value = '';
      loginPassword.focus();
    }
  });

  signOutBtn.addEventListener('click', () => {
    currentUser = null;
    safeRemove(localStorage, AUTH_KEY);
    clearAllTimers();
    if (firebaseListener) firebaseListener();
    showLogin();
  });

  const savedUser = safeGet(localStorage, AUTH_KEY);
  if (savedUser === CREDENTIALS.username) {
    currentUser = savedUser;
    showApp();
  } else {
    showLogin();
  }

  const THEME_KEY = 'grocery.theme';
  const themeBtn = document.getElementById('themeBtn');

  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    themeBtn.textContent = theme === 'light' ? '☀️ Light' : '🌙 Dark';
  }

  themeBtn.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    safeSet(localStorage, THEME_KEY, next);
  });

  applyTheme(currentTheme());

  const LISTS = ['Grocery List', 'Costco List'];
  const LIST_ICONS = { 'Grocery List': '🛒', 'Costco List': '📦' };

  const BUILT_IN_CATEGORIES = {
    '🥦 Produce': ['apple','apples','banana','bananas','berry','berries','spinach','lettuce','tomato','tomatoes','potato','potatoes','onion','onions','garlic','carrot','carrots','avocado','lemon','lime','cucumber','grape','grapes','broccoli','pepper','mushroom','ginger','fruit','vegetable'],
    '🥛 Dairy': ['milk','cheese','butter','yogurt','yoghurt','cream','egg','eggs','paneer'],
    '🍞 Bakery': ['bread','puff pastry','croissant','bagel','bun','buns','muffin','cake','pita'],
    '🍗 Meat & Seafood': ['chicken','beef','pork','lamb','salmon','fish','shrimp','prawns','bacon','turkey','mince','steak'],
    '🍿 Snacks': ['chips','chocolate','popcorn','nuts','biscuit','biscuits','crackers','cookie','cookies','candy'],
    '🥤 Drinks': ['juice','soda','coke','water','coffee','tea','sparkling water','energy drink'],
    '❄️ Frozen': ['ice cream','frozen peas','pizza','frozen berries','nuggets'],
    '🧽 Household': ['paper towel','toilet paper','trash bags','sponge','cleaner'],
    '🍚 Pantry': ['rice','pasta','olive oil','flour','sugar','salt','pepper','sauce','cereal','oats','canned beans','chickpeas'],
    '🍛 Indian Store': ['atta','basmati','ghee','masala','turmeric','paneer','roti','naan']
  };

  function emptyState() {
    const listsData = {};
    LISTS.forEach(name => { listsData[name] = { items: [] }; });
    return { activeList: 'Grocery List', listsData, customChips: [], learned: {} };
  }

  let state = emptyState();

  function saveStateLocal() { safeSet(localStorage, `grocery.state.${currentUser}`, JSON.stringify(state)); }

  function loadStateLocal() {
    try {
      const raw = safeGet(localStorage, `grocery.state.${currentUser}`);
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
        customChips: Array.isArray(parsed.customChips) ? parsed.customChips : [],
        learned: (parsed.learned && typeof parsed.learned === 'object') ? parsed.learned : {}
      };
    } catch (e) {
      return emptyState();
    }
  }

  function syncStateToFirebase() {
    if (!firebaseDb || !currentUser) return;
    firebaseDb.ref(`users/${currentUser}/state`).set(state).catch(err => console.error('Firebase sync error:', err));
  }

  function activeItems() { return state.listsData[state.activeList].items; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

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

  function learn(name, category) { const key = name.trim().toLowerCase(); if (key && category) state.learned[key] = category; }
  function allChipCategories() { return [...Object.keys(BUILT_IN_CATEGORIES), ...state.customChips]; }

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
    saveStateLocal();
    syncStateToFirebase();
    renderAll();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    state.listsData = JSON.parse(redoStack.pop());
    clearAllTimers();
    resumeTimers();
    saveStateLocal();
    syncStateToFirebase();
    renderAll();
  }
  function syncUndoRedoButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  }

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  const REMOVAL_MS = 60 * 1000;
  const timers = new Map();

  function clearTimer(id) { const h = timers.get(id); if (h) { clearTimeout(h); timers.delete(id); } }
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
    saveStateLocal();
    syncStateToFirebase();
    renderAll();
  }
  function resumeTimers() {
    LISTS.forEach(name => {
      state.listsData[name].items.forEach(item => {
        if (item.purchased && item.purchasedAt && !item.removed) { scheduleRemoval(item); }
      });
    });
  }

  const listNav = document.getElementById('listNav');
  const pageTitle = document.getElementById('pageTitle');
  const tabList = document.getElementById('tabList');
  const tabRemoved = document.getElementById('tabRemoved');
  const toggleAddBtn = document.getElementById('toggleAddBtn');
  const countActive = document.getElementById('countActive');
  const countRemoved = document.getElementById('countRemoved');
  const viewList = document.getElementById('viewList');
  const viewRemoved = document.getElementById('viewRemoved');
  const addPanel = document.getElementById('addPanel');
  const addForm = document.getElementById('addForm');
  const itemName = document.getElementById('itemName');
  const categoryInput = document.getElementById('categoryInput');
  const quickCategories = document.getElementById('quickCategories');
  const customChipInput = document.getElementById('customChipInput');
  const addChipBtn = document.getElementById('addChipBtn');
  const quantityInput = document.getElementById('quantityInput');
  const unitInput = document.getElementById('unitInput');
  const searchInput = document.getElementById('searchInput');
  const listGroups = document.getElementById('listGroups');
  const removedGroups = document.getElementById('removedGroups');
  const toastEl = document.getElementById('toast');

  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, 2200);
  }

  let currentView = 'list';
  let addPanelOpen = true;
  let categoryEditedByUser = false;

  function renderSidebar() {
    listNav.innerHTML = '';
    LISTS.forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-btn' + (name === state.activeList ? ' active' : '');
      btn.innerHTML = `<span>${LIST_ICONS[name]}</span><span>${escapeHtml(name)}</span>`;
      btn.addEventListener('click', () => {
        state.activeList = name;
        saveStateLocal();
        syncStateToFirebase();
        renderAll();
      });
      listNav.appendChild(btn);
    });
  }

  function setView(view) {
    currentView = view;
    tabList.classList.toggle('selected', view === 'list');
    tabRemoved.classList.toggle('selected', view === 'removed');
    viewList.classList.toggle('active', view === 'list');
    viewRemoved.classList.toggle('active', view === 'removed');
    syncAddPanelVisibility();
  }

   function syncAddPanelVisibility() {
    addPanel.classList.toggle('open', currentView === 'list' && addPanelOpen);
    // Hide list view when add panel is open
    viewList.classList.toggle('active', currentView === 'list' && !addPanelOpen);
  }

  tabList.addEventListener('click', () => {
    setView('list');
    addPanelOpen = false;  // Close add panel when viewing list
    syncAddPanelVisibility();
  });
  tabRemoved.addEventListener('click', () => setView('removed'));
  toggleAddBtn.addEventListener('click', () => {
    addPanelOpen = !addPanelOpen;
    setView('list');
    if (addPanelOpen) itemName.focus();
    syncAddPanelVisibility();
  });
  
  function renderQuickCategories() {
    quickCategories.innerHTML = '';
    allChipCategories().forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-chip';
      btn.textContent = cat;
      if (categoryInput.value.trim() === cat) btn.classList.add('chosen');
      btn.addEventListener('click', () => {
        categoryInput.value = cat;
        categoryEditedByUser = true;
        renderQuickCategories();
      });
      quickCategories.appendChild(btn);
    });
  }

  addChipBtn.addEventListener('click', () => {
    const val = customChipInput.value.trim();
    if (!val) return;
    if (!allChipCategories().includes(val)) {
      state.customChips.push(val);
      saveStateLocal();
      syncStateToFirebase();
    }
    customChipInput.value = '';
    categoryInput.value = val;
    categoryEditedByUser = true;
    renderQuickCategories();
  });

  customChipInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addChipBtn.click(); } });

  itemName.addEventListener('input', () => {
    if (categoryEditedByUser) return;
    const suggestion = suggestCategory(itemName.value);
    if (suggestion) {
      categoryInput.value = suggestion;
      renderQuickCategories();
    }
  });

  categoryInput.addEventListener('input', () => { categoryEditedByUser = true; renderQuickCategories(); });

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
      id: uid(),
      name,
      category,
      quantity: qty,
      unit,
      purchased: false,
      purchasedAt: null,
      removed: false,
      createdAt: Date.now()
    });
    learn(name, category);
    saveStateLocal();
    syncStateToFirebase();

    itemName.value = '';
    categoryInput.value = '';
    quantityInput.value = '1';
    categoryEditedByUser = false;
    renderAll();
    showToast(`Added "${name}" to ${category}`);
    itemName.focus();
  });

  function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

  function buildRow(item, { removedView }) {
    const row = document.createElement('div');
    row.className = 'row' + (item.purchased ? ' purchased' : '');
    row.dataset.id = item.id;

    const checkboxHtml = removedView ? '' : `<label class="checkbox"><input type="checkbox" data-action="toggle" ${item.purchased ? 'checked' : ''} /><span class="checkmark"></span></label>`;

    let timerHtml = '';
    if (item.purchased && item.purchasedAt && !item.removed) {
      const expiresAt = item.purchasedAt + REMOVAL_MS;
      const secondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      timerHtml = `<span class="row-timer" data-expires-at="${expiresAt}">${secondsLeft > 0 ? `Removing in ${secondsLeft}s` : 'Removing…'}</span>`;
    }

    const actionHtml = removedView
      ? `<button type="button" class="row-action restore" data-action="restore" title="Restore">↺</button>`
      : `<button type="button" class="row-action" data-action="delete" title="Remove">🗑</button>`;

    row.innerHTML = `${checkboxHtml}<div class="row-info"><span class="row-name">${escapeHtml(item.name)}</span><span class="row-meta">${item.quantity} ${escapeHtml(item.unit)}</span><span class="row-meta">${escapeHtml(item.category)}</span>${timerHtml}</div>${actionHtml}`;
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
      listGroups.innerHTML = `<p class="empty">No items yet. Use "+ Add Item" above to get started.</p>`;
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
      groups[cat].sort((a, b) => a.purchased === b.purchased ? a.createdAt - b.createdAt : a.purchased ? 1 : -1)
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
    items.sort((a, b) => b.createdAt - a.createdAt).forEach(item => rows.appendChild(buildRow(item, { removedView: true })));
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
      saveStateLocal();
      syncStateToFirebase();
      renderAll();
      scheduleRemoval(item);
    } else {
      item.purchasedAt = null;
      clearTimer(item.id);
      saveStateLocal();
      syncStateToFirebase();
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
    saveStateLocal();
    syncStateToFirebase();
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
    saveStateLocal();
    syncStateToFirebase();
    renderAll();
  });

  searchInput.addEventListener('input', renderList);

  setInterval(() => {
    document.querySelectorAll('.row-timer').forEach(el => {
      const secondsLeft = Math.max(0, Math.ceil((Number(el.dataset.expiresAt) - Date.now()) / 1000));
      el.textContent = secondsLeft > 0 ? `Removing in ${secondsLeft}s` : 'Removing…';
    });
  }, 1000);

  function renderHeader() {
    pageTitle.innerHTML = `${escapeHtml(state.activeList)} <span class="live-badge">LIVE</span>`;
    const items = activeItems().filter(i => !i.removed);
    countActive.textContent = items.length;
    countRemoved.textContent = activeItems().filter(i => i.removed).length;
  }

  function renderAll() {
    renderSidebar();
    renderHeader();
    renderQuickCategories();
    renderList();
    renderRemoved();
    syncUndoRedoButtons();
    syncAddPanelVisibility();
  }

  function setupFirebaseSync() {
    if (!firebaseDb || !currentUser) return;
    if (firebaseListener) firebaseListener();
    firebaseListener = firebaseDb.ref(`users/${currentUser}/state`).on('value', snapshot => {
      if (snapshot.exists()) {
        const remoteState = snapshot.val();
        if (JSON.stringify(remoteState) !== JSON.stringify(state)) {
          state = remoteState;
          clearAllTimers();
          resumeTimers();
          renderAll();
        }
      }
    });
  }

  let started = false;
  function init() {
    if (started) return;
    started = true;
    state = loadStateLocal();
    setupFirebaseSync();
    resumeTimers();
    setView('list');
    renderAll();
  }

  if (currentUser) init();
})();
