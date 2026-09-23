(() => {
  'use strict';

  /* ============================================================
     Auth
     ============================================================ */
  const CREDENTIALS = { username: 'ASWATHY', password: 'HARI' };
  const AUTH_KEY = 'groceryApp.authed';

  // Some preview/sandboxed contexts block sessionStorage entirely and throw
  // a SecurityError just from touching it. These wrappers make sure that
  // never stops the login flow — storage is a nice-to-have (remembers you're
  // logged in across a refresh), never a requirement for logging in.
  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* ignore — storage unavailable */ }
  }
  function safeSessionRemove(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* ignore — storage unavailable */ }
  }

  const loginScreen = document.getElementById('login-screen');
  const appRoot = document.getElementById('app');
  const loginForm = document.getElementById('login-form');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');

  let isAuthed = safeSessionGet(AUTH_KEY) === '1';

  function showApp() {
    loginScreen.hidden = true;
    appRoot.hidden = false;
  }

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
    const u = loginUsername.value.trim();
    const p = loginPassword.value;
    if (u === CREDENTIALS.username && p === CREDENTIALS.password) {
      isAuthed = true;
      safeSessionSet(AUTH_KEY, '1');
      loginError.hidden = true;
      showApp();
      init();
    } else {
      loginError.hidden = false;
      loginPassword.value = '';
      loginPassword.focus();
    }
  });

  if (isAuthed) {
    showApp();
  } else {
    showLogin();
  }

  /* ============================================================
     Data / persistence
     ============================================================ */
  const STORAGE_KEY = 'groceryApp.state.v1';
  const LISTS = ['Grocery List', 'Costco List', 'Pantry Inventory', 'Recipe Planner'];
  const LIST_ICONS = { 'Grocery List': '🛒', 'Costco List': '📦', 'Pantry Inventory': '🗄️', 'Recipe Planner': '📖' };

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

  function defaultState() {
    const listsData = {};
    LISTS.forEach(name => { listsData[name] = { items: [] }; });
    return { activeListName: 'Grocery List', listsData, customChips: [], learned: {} };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const fresh = defaultState();
      return {
        activeListName: parsed.activeListName && fresh.listsData[parsed.activeListName] ? parsed.activeListName : 'Grocery List',
        listsData: parsed.listsData && typeof parsed.listsData === 'object' ? { ...fresh.listsData, ...parsed.listsData } : fresh.listsData,
        customChips: Array.isArray(parsed.customChips) ? parsed.customChips : [],
        learned: parsed.learned && typeof parsed.learned === 'object' ? parsed.learned : {}
      };
    } catch (e) {
      console.warn('Could not read saved data, starting fresh.', e);
      return defaultState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save to localStorage.', e);
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function currentList() {
    return state.listsData[state.activeListName];
  }

  /* ============================================================
     Category suggestion + learning
     ============================================================ */
  function suggestCategory(rawName) {
    const q = rawName.trim().toLowerCase();
    if (!q) return null;

    let bestLearned = null, bestLearnedLen = 0;
    for (const key in state.learned) {
      if (q.includes(key) && key.length > bestLearnedLen) {
        bestLearned = state.learned[key];
        bestLearnedLen = key.length;
      }
    }
    if (bestLearned) return bestLearned;

    let bestBuiltIn = null, bestBuiltInLen = 0;
    for (const [category, keywords] of Object.entries(BUILT_IN_CATEGORIES)) {
      for (const kw of keywords) {
        if (q.includes(kw) && kw.length > bestBuiltInLen) {
          bestBuiltIn = category;
          bestBuiltInLen = kw.length;
        }
      }
    }
    return bestBuiltIn;
  }

  function learn(name, category) {
    const key = name.trim().toLowerCase();
    if (!key || !category) return;
    state.learned[key] = category;
  }

  /* ============================================================
     Undo / Redo
     ============================================================ */
  const historyStack = [];
  const redoStack = [];
  const MAX_HISTORY = 50;

  function snapshot() {
    return JSON.stringify(state.listsData);
  }

  function saveSnapshot() {
    historyStack.push(snapshot());
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    redoStack.length = 0;
    updateUndoRedoButtons();
  }

  function undo() {
    if (historyStack.length === 0) return;
    redoStack.push(snapshot());
    state.listsData = JSON.parse(historyStack.pop());
    clearAllTimers();
    resumeTimers();
    saveState();
    renderAll();
    updateUndoRedoButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;
    historyStack.push(snapshot());
    state.listsData = JSON.parse(redoStack.pop());
    clearAllTimers();
    resumeTimers();
    saveState();
    renderAll();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = historyStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  }

  /* ============================================================
     Purchased-item auto-removal (independent per-item timers)
     ============================================================ */
  const REMOVAL_DELAY_MS = 60 * 1000;
  const removalTimers = new Map();

  function clearRemovalTimer(itemId) {
    const h = removalTimers.get(itemId);
    if (h) { clearTimeout(h); removalTimers.delete(itemId); }
  }

  function clearAllTimers() {
    removalTimers.forEach(h => clearTimeout(h));
    removalTimers.clear();
  }

  function findItemAnywhere(itemId) {
    for (const listName of LISTS) {
      const item = state.listsData[listName].items.find(i => i.id === itemId);
      if (item) return { item, listName };
    }
    return null;
  }

  function scheduleRemoval(item) {
    clearRemovalTimer(item.id);
    if (!item.purchased || !item.purchasedAt || item.status === 'removed') return;
    const remaining = REMOVAL_DELAY_MS - (Date.now() - item.purchasedAt);
    if (remaining <= 0) {
      finalizeRemoval(item.id);
      return;
    }
    const handle = setTimeout(() => finalizeRemoval(item.id), remaining);
    removalTimers.set(item.id, handle);
  }

  function finalizeRemoval(itemId) {
    clearRemovalTimer(itemId);
    const found = findItemAnywhere(itemId);
    if (!found || found.item.status === 'removed') return;
    saveSnapshot();
    found.item.status = 'removed';
    saveState();
    renderAll();
  }

  function resumeTimers() {
    LISTS.forEach(listName => {
      state.listsData[listName].items.forEach(item => {
        if (item.purchased && item.purchasedAt && item.status !== 'removed') {
          scheduleRemoval(item);
        }
      });
    });
  }

  /* ============================================================
     DOM references
     ============================================================ */
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleBtn');
  const navList = document.getElementById('navList');
  const headerTitle = document.getElementById('headerTitle');
  const signOutBtn = document.getElementById('signOutBtn');
  const darkToggle = document.getElementById('darkToggle');
  const shareBtn = document.getElementById('shareBtn');

  const statTotal = document.getElementById('statTotal');
  const statCompleted = document.getElementById('statCompleted');
  const statCategories = document.getElementById('statCategories');

  const tabActiveBtn = document.getElementById('tabActiveBtn');
  const tabAddBtn = document.getElementById('tabAddBtn');
  const tabRemovedBtn = document.getElementById('tabRemovedBtn');
  const activeCountBadge = document.getElementById('activeCountBadge');
  const removedCountBadge = document.getElementById('removedCountBadge');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  const panelAdd = document.getElementById('panel-add');
  const panelActive = document.getElementById('panel-active');
  const panelRemoved = document.getElementById('panel-removed');

  const addForm = document.getElementById('add-form');
  const itemNameInput = document.getElementById('itemNameInput');
  const categoryInput = document.getElementById('categoryInput');
  const quickCategories = document.getElementById('quickCategories');
  const customChipInput = document.getElementById('customChipInput');
  const addChipBtn = document.getElementById('addChipBtn');
  const quantityInput = document.getElementById('quantityInput');
  const unitSelect = document.getElementById('unitSelect');

  const searchInput = document.getElementById('searchInput');
  const filterCategory = document.getElementById('filterCategory');
  const itemsList = document.getElementById('itemsList');
  const removedList = document.getElementById('removedList');

  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  let currentTab = 'add';
  let categoryTouchedByUser = false;

  /* ============================================================
     Sidebar / navigation
     ============================================================ */
  function renderSidebar() {
    navList.innerHTML = '';
    LISTS.forEach(name => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'nav-item' + (name === state.activeListName ? ' active' : '');
      btn.innerHTML = `<span class="nav-icon">${LIST_ICONS[name] || '📋'}</span><span class="nav-text">${escapeHtml(name)}</span>`;
      btn.addEventListener('click', () => {
        state.activeListName = name;
        saveState();
        renderAll();
      });
      li.appendChild(btn);
      navList.appendChild(li);
    });
  }

  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

  darkToggle.addEventListener('click', () => showToast('This app is dark-themed only for now.'));
  shareBtn.addEventListener('click', () => showToast('Sharing isn\'t hooked up in this build yet.'));

  signOutBtn.addEventListener('click', () => {
    isAuthed = false;
    safeSessionRemove(AUTH_KEY);
    clearAllTimers();
    showLogin();
  });

  /* ============================================================
     Tabs
     ============================================================ */
  function setTab(tab) {
    currentTab = tab;
    panelAdd.hidden = tab !== 'add';
    panelActive.hidden = tab !== 'active';
    panelRemoved.hidden = tab !== 'removed';
    tabActiveBtn.classList.toggle('selected', tab === 'active');
    tabAddBtn.classList.toggle('selected', tab === 'add');
    tabRemovedBtn.classList.toggle('selected', tab === 'removed');
  }
  tabActiveBtn.addEventListener('click', () => setTab('active'));
  tabAddBtn.addEventListener('click', () => setTab('add'));
  tabRemovedBtn.addEventListener('click', () => setTab('removed'));
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  /* ============================================================
     Quick category chips
     ============================================================ */
  function allChipCategories() {
    return [...Object.keys(BUILT_IN_CATEGORIES), ...state.customChips];
  }

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
        categoryTouchedByUser = true;
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
      saveState();
    }
    customChipInput.value = '';
    categoryInput.value = val;
    categoryTouchedByUser = true;
    renderQuickCategories();
  });
  customChipInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addChipBtn.click(); }
  });

  /* ============================================================
     Add item form
     ============================================================ */
  itemNameInput.addEventListener('input', () => {
    if (categoryTouchedByUser) return;
    const suggestion = suggestCategory(itemNameInput.value);
    if (suggestion) {
      categoryInput.value = suggestion;
      renderQuickCategories();
    }
  });

  categoryInput.addEventListener('input', () => {
    categoryTouchedByUser = true;
    renderQuickCategories();
  });

  addForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    if (!name) {
      itemNameInput.classList.add('invalid');
      itemNameInput.focus();
      setTimeout(() => itemNameInput.classList.remove('invalid'), 1200);
      return;
    }
    const category = categoryInput.value.trim() || 'Uncategorised';
    const qty = Math.max(1, parseInt(quantityInput.value, 10) || 1);
    const unit = unitSelect.value || 'pcs';

    saveSnapshot();
    currentList().items.push({
      id: uid(),
      name,
      category,
      quantity: qty,
      unit,
      purchased: false,
      purchasedAt: null,
      status: 'active',
      createdAt: Date.now()
    });
    learn(name, category);
    saveState();

    itemNameInput.value = '';
    categoryInput.value = '';
    quantityInput.value = '1';
    categoryTouchedByUser = false;
    renderAll();
    showToast(`Added "${name}" to ${category}.`);
    setTab('active');
    itemNameInput.focus();
  });

  /* ============================================================
     Item list rendering
     ============================================================ */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderFilterOptions() {
    const cats = [...new Set(currentList().items.filter(i => i.status === 'active').map(i => i.category))].sort();
    const prev = filterCategory.value;
    filterCategory.innerHTML = '<option value="ALL">All Categories</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      filterCategory.appendChild(opt);
    });
    if ([...filterCategory.options].some(o => o.value === prev)) filterCategory.value = prev;
  }

  function buildItemRow(item, { showRestore }) {
    const row = document.createElement('div');
    row.className = 'list-row' + (item.purchased ? ' purchased' : '');
    row.dataset.id = item.id;

    let checkboxHtml = '';
    if (!showRestore) {
      checkboxHtml = `
        <label class="checkbox-wrap">
          <input type="checkbox" data-action="toggle" ${item.purchased ? 'checked' : ''} />
          <span class="checkmark"></span>
        </label>`;
    }

    const timerHtml = (item.purchased && item.purchasedAt && item.status !== 'removed')
      ? (() => {
          const expiresAt = item.purchasedAt + REMOVAL_DELAY_MS;
          const secondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
          const text = secondsLeft > 0 ? `Removing in ${secondsLeft}s` : 'Removing…';
          return `<span class="purchase-timer" data-expires-at="${expiresAt}">${text}</span>`;
        })()
      : '';

    row.innerHTML = `
      ${checkboxHtml}
      <div class="item-info">
        <span class="item-name">${escapeHtml(item.name)}</span>
        <span class="item-qty">${item.quantity} ${escapeHtml(item.unit)}</span>
        <span class="item-qty">${escapeHtml(item.category)}</span>
        ${timerHtml}
      </div>
      <div class="item-actions">
        ${showRestore
          ? `<button type="button" class="icon-btn restore" data-action="restore" title="Restore item">↺</button>`
          : `<button type="button" class="icon-btn" data-action="remove" title="Remove item">🗑</button>`}
      </div>
    `;
    return row;
  }

  function renderActiveList() {
    renderFilterOptions();
    itemsList.innerHTML = '';

    const term = searchInput.value.trim().toLowerCase();
    const catFilter = filterCategory.value;

    let items = currentList().items.filter(i => i.status === 'active');
    if (term) items = items.filter(i => i.name.toLowerCase().includes(term));
    if (catFilter !== 'ALL') items = items.filter(i => i.category === catFilter);

    if (items.length === 0) {
      itemsList.innerHTML = '<p class="empty-msg">No items found. Add something from the + Add Item tab.</p>';
      return;
    }

    const byCategory = {};
    items.forEach(i => {
      if (!byCategory[i.category]) byCategory[i.category] = [];
      byCategory[i.category].push(i);
    });

    Object.keys(byCategory).sort().forEach(cat => {
      const group = document.createElement('div');
      group.className = 'category-group';
      const h4 = document.createElement('h4');
      h4.textContent = cat;
      group.appendChild(h4);

      byCategory[cat]
        .sort((a, b) => (a.purchased === b.purchased) ? a.createdAt - b.createdAt : (a.purchased ? 1 : -1))
        .forEach(item => group.appendChild(buildItemRow(item, { showRestore: false })));

      itemsList.appendChild(group);
    });
  }

  function renderRemovedList() {
    removedList.innerHTML = '';
    const items = currentList().items.filter(i => i.status === 'removed');
    if (items.length === 0) {
      removedList.innerHTML = '<p class="empty-msg">Nothing removed yet.</p>';
      return;
    }
    items
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach(item => removedList.appendChild(buildItemRow(item, { showRestore: true })));
  }

  itemsList.addEventListener('change', e => {
    if (e.target.dataset.action !== 'toggle') return;
    const row = e.target.closest('.list-row');
    const item = currentList().items.find(i => i.id === row.dataset.id);
    if (!item) return;

    saveSnapshot();
    item.purchased = e.target.checked;
    if (item.purchased) {
      item.purchasedAt = Date.now();
      saveState();
      renderAll();
      scheduleRemoval(item);
    } else {
      item.purchasedAt = null;
      clearRemovalTimer(item.id);
      saveState();
      renderAll();
    }
  });

  itemsList.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="remove"]');
    if (!btn) return;
    const row = btn.closest('.list-row');
    const item = currentList().items.find(i => i.id === row.dataset.id);
    if (!item) return;
    saveSnapshot();
    clearRemovalTimer(item.id);
    item.status = 'removed';
    saveState();
    renderAll();
  });

  removedList.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="restore"]');
    if (!btn) return;
    const row = btn.closest('.list-row');
    const item = currentList().items.find(i => i.id === row.dataset.id);
    if (!item) return;
    saveSnapshot();
    item.status = 'active';
    item.purchased = false;
    item.purchasedAt = null;
    clearRemovalTimer(item.id);
    saveState();
    renderAll();
  });

  searchInput.addEventListener('input', renderActiveList);
  filterCategory.addEventListener('change', renderActiveList);

  /* ============================================================
     Live countdown ticker (cosmetic only — doesn't touch state)
     ============================================================ */
  setInterval(() => {
    document.querySelectorAll('.purchase-timer').forEach(el => {
      const secondsLeft = Math.max(0, Math.ceil((Number(el.dataset.expiresAt) - Date.now()) / 1000));
      el.textContent = secondsLeft > 0 ? `Removing in ${secondsLeft}s` : 'Removing…';
    });
  }, 1000);

  /* ============================================================
     Stats + top-level render
     ============================================================ */
  function renderStats() {
    const items = currentList().items;
    const active = items.filter(i => i.status === 'active');
    const purchasedPending = active.filter(i => i.purchased);
    const removed = items.filter(i => i.status === 'removed');
    const cats = new Set(active.map(i => i.category));

    statTotal.textContent = active.length;
    statCompleted.textContent = purchasedPending.length;
    statCategories.textContent = cats.size;
    activeCountBadge.textContent = active.length;
    removedCountBadge.textContent = removed.length;
  }

  function renderHeader() {
    headerTitle.innerHTML = `${escapeHtml(state.activeListName)} <span class="live-badge">LIVE</span>`;
  }

  function renderAll() {
    renderSidebar();
    renderHeader();
    renderStats();
    renderQuickCategories();
    renderActiveList();
    renderRemovedList();
    updateUndoRedoButtons();
  }

  /* ============================================================
     Init
     ============================================================ */
  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    resumeTimers();
    setTab('add');
    renderAll();
  }

  if (isAuthed) {
    init();
  }
})();
