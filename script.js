// State Management
const listsData = {
  'Grocery List': [],
  'Costco List': [],
  'Pantry Inventory': [],
  'Recipe Planner': []
};

let activeListName = 'Grocery List';
let currentTab = 'active'; // 'active', 'completed', 'removed'

// Undo/Redo Stacks
const historyStack = [];
const redoStack = [];

// Category Auto-detection Dictionary
const categoryKeywords = {
  '🥦 Produce': ['apple', 'apples', 'banana', 'bananas', 'berry', 'berries', 'spinach', 'lettuce', 'tomato', 'tomatoes', 'potato', 'potatoes', 'onion', 'onions', 'garlic', 'carrot', 'carrots', 'avocado', 'lemon', 'lime', 'cucumber', 'grape', 'grapes'],
  '🧀 Dairy': ['milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'sour cream', 'paneer', 'egg', 'eggs'],
  '🥐 Bakery': ['bread', 'puff pastry', 'croissant', 'bagel', 'bun', 'buns', 'muffin', 'cake', 'pita'],
  '🥩 Meat & Seafood': ['chicken', 'beef', 'pork', 'lamb', 'salmon', 'fish', 'shrimp', 'prawns', 'bacon', 'turkey', 'mince', 'steak'],
  '🍿 Snacks': ['chips', 'chocolate', 'popcorn', 'nuts', 'biscuit', 'biscuits', 'crackers', 'cookie', 'cookies', 'candy'],
  '🧃 Drinks': ['juice', 'soda', 'coke', 'water', 'coffee', 'tea', 'sparkling water', 'energy drink'],
  '❄️ Frozen': ['ice cream', 'frozen peas', 'pizza', 'frozen berries', 'nuggets', 'frozen veggies'],
  '🧹 Household': ['paper towel', 'toilet paper', 'dish soap', 'laundry detergent', 'trash bags', 'sponge', 'cleaner'],
  '🥫 Pantry': ['rice', 'pasta', 'olive oil', 'flour', 'sugar', 'salt', 'pepper', 'sauce', 'cereal', 'oats', 'canned beans', 'chickpeas'],
  '🍛 Indian Store': ['atta', 'basmati', 'dal', 'ghee', 'masala', 'turmeric', 'paneer', 'roti', 'naan']
};

// DOM References
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const headerTitle = document.getElementById('headerTitle');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const itemNameInput = document.getElementById('itemNameInput');
const categoryInput = document.getElementById('categoryInput');
const quantityInput = document.getElementById('quantityInput');
const unitSelect = document.getElementById('unitSelect');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const removedCount = document.getElementById('removedCount');
const itemsList = document.getElementById('itemsList');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const statTotal = document.getElementById('statTotal');
const statCompleted = document.getElementById('statCompleted');
const statCategories = document.getElementById('statCategories');

// Collapsible Side Drawer
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Auto-Categorisation Listener
itemNameInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    categoryInput.value = '';
    return;
  }

  let detectedCategory = '';
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      detectedCategory = category;
      break;
    }
  }

  if (detectedCategory) {
    categoryInput.value = detectedCategory;
  }
});

// Save snapshot to history stack
function saveSnapshot() {
  historyStack.push(JSON.stringify(listsData));
  redoStack.length = 0; // Clear redo on new action
}

// Undo Action
function undoAction() {
  if (historyStack.length === 0) return;
  redoStack.push(JSON.stringify(listsData));
  const previousState = JSON.parse(historyStack.pop());
  Object.assign(listsData, previousState);
  renderList();
}

// Redo Action
function redoAction() {
  if (redoStack.length === 0) return;
  historyStack.push(JSON.stringify(listsData));
  const nextState = JSON.parse(redoStack.pop());
  Object.assign(listsData, nextState);
  renderList();
}

// Switch active menu list
function switchList(listName) {
  activeListName = listName;
  headerTitle.textContent = listName;
  formTitle.textContent = `Add New ${listName.replace(' List', '')} Item`;
  submitBtn.textContent = `Add to ${listName}`;

  sidebar.classList.add('collapsed');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (listName === 'Grocery List') document.getElementById('navGrocery').classList.add('active');
  if (listName === 'Costco List') document.getElementById('navCostco').classList.add('active');
  if (listName === 'Pantry Inventory') document.getElementById('navPantry').classList.add('active');
  if (listName === 'Recipe Planner') document.getElementById('navRecipes').classList.add('active');

  renderList();
}

// Set Active Tab (Active / Completed / Removed)
function setTab(tabName) {
  currentTab = tabName;
  document.getElementById('tabActive').classList.toggle('active', tabName === 'active');
  document.getElementById('tabCompleted').classList.toggle('active', tabName === 'completed');
  document.getElementById('tabRemoved').classList.toggle('active', tabName === 'removed');
  renderList();
}

// Select category via chip
function selectCategory(categoryName) {
  categoryInput.value = categoryName;
}

// Add Custom Chip
function addCustomChip() {
  const chipInput = document.getElementById('customChipInput');
  const val = chipInput.value.trim();
  if (!val) return;

  const chipsContainer = document.getElementById('chipsContainer');
  const newBtn = document.createElement('button');
  newBtn.className = 'chip';
  newBtn.textContent = val;
  newBtn.onclick = () => selectCategory(val);

  chipsContainer.appendChild(newBtn);
  chipInput.value = '';
}

// Add Item to List
function addItem() {
  const name = itemNameInput.value.trim();
  const category = categoryInput.value.trim() || '📦 Other';
  const qty = parseInt(quantityInput.value) || 1;
  const unit = unitSelect.value;

  if (!name) return;

  saveSnapshot();

  listsData[activeListName].push({
    id: Date.now(),
    name,
    category,
    quantity: qty,
    unit: unit,
    status: 'active' // 'active', 'completed', 'removed'
  });

  itemNameInput.value = '';
  categoryInput.value = '';
  quantityInput.value = '1';

  renderList();
}

// Toggle Item Status
function toggleStatus(id) {
  saveSnapshot();
  const item = listsData[activeListName].find(i => i.id === id);
  if (item) {
    item.status = item.status === 'completed' ? 'active' : 'completed';
  }
  renderList();
}

// Move Item to Trash
function removeItem(id) {
  saveSnapshot();
  const item = listsData[activeListName].find(i => i.id === id);
  if (item) {
    item.status = 'removed';
  }
  renderList();
}

// Populate Category Filter Dropdown
function updateFilterOptions() {
  const currentList = listsData[activeListName];
  const categories = [...new Set(currentList.map(item => item.category))];
  
  filterCategory.innerHTML = '<option value="ALL">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterCategory.appendChild(opt);
  });
}

// Render Items to UI
function renderList() {
  const currentList = listsData[activeListName];
  const searchQuery = searchInput.value.toLowerCase().trim();
  const selectedCat = filterCategory.value;

  // Counts
  const activeItems = currentList.filter(i => i.status === 'active');
  const completedItems = currentList.filter(i => i.status === 'completed');
  const removedItems = currentList.filter(i => i.status === 'removed');

  activeCount.textContent = activeItems.length;
  completedCount.textContent = completedItems.length;
  removedCount.textContent = removedItems.length;

  // Update Stats Header
  statTotal.textContent = currentList.length;
  statCompleted.textContent = completedItems.length;
  statCategories.textContent = new Set(currentList.map(i => i.category)).size;

  updateFilterOptions();

  // Filtering
  let filtered = currentList.filter(i => i.status === currentTab);

  if (searchQuery) {
    filtered = filtered.filter(i => i.name.toLowerCase().includes(searchQuery));
  }

  if (selectedCat !== 'ALL') {
    filtered = filtered.filter(i => i.category === selectedCat);
  }

  itemsList.innerHTML = '';

  if (filtered.length === 0) {
    itemsList.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 20px;">No items found.</li>`;
    return;
  }

  filtered.forEach(item => {
    const li = document.createElement('li');
    li.className = 'list-item-row';
    li.innerHTML = `
      <div class="item-left">
        <input type="checkbox" class="item-checkbox" ${item.status === 'completed' ? 'checked' : ''} onchange="toggleStatus(${item.id})" />
        <div class="item-info">
          <span class="item-name ${item.status === 'completed' ? 'completed' : ''}">${item.name}</span>
          <span class="item-category">${item.category}</span>
        </div>
      </div>
      <div class="item-right">
        <span class="item-quantity">${item.quantity} ${item.unit}</span>
        <div class="action-btn-group">
          <button class="btn-action" onclick="removeItem(${item.id})" title="Delete">🗑️</button>
        </div>
      </div>
    `;
    itemsList.appendChild(li);
  });
}

// Share Placeholder
function shareList() {
  alert(`Sharing list link for "${activeListName}" copied to clipboard!`);
}

// Initialize rendering on load
renderList();
