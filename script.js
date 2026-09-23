// Data store for separate lists
const listsData = {
  'Grocery List': [],
  'Costco List': []
};

let activeListName = 'Grocery List';

// DOM Element references
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const headerTitle = document.getElementById('headerTitle');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const itemNameInput = document.getElementById('itemNameInput');
const categoryInput = document.getElementById('categoryInput');
const activeCount = document.getElementById('activeCount');
const itemsList = document.getElementById('itemsList');

// Toggle collapsible drawer
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Switch active view between Grocery List and Costco List
function switchList(listName) {
  activeListName = listName;
  headerTitle.textContent = listName;
  formTitle.textContent = `Add New ${listName === 'Grocery List' ? 'Grocery' : 'Costco'} Item`;
  submitBtn.textContent = `Add to ${listName}`;

  // Automatically collapse sidebar when a menu item is clicked
  sidebar.classList.add('collapsed');

  // Update menu active highlights
  document.getElementById('navGrocery').classList.toggle('active', listName === 'Grocery List');
  document.getElementById('navCostco').classList.toggle('active', listName === 'Costco List');

  renderList();
}

// Fill category input from chip selection
function selectCategory(categoryName) {
  categoryInput.value = categoryName;
}

// Add custom chip dynamically
function addCustomChip() {
  const chipInput = document.getElementById('customChipInput');
  const val = chipInput.value.trim();
  if (!val) return;

  const chipsGrid = document.querySelector('.chips-grid');
  const newBtn = document.createElement('button');
  newBtn.className = 'chip';
  newBtn.textContent = val;
  newBtn.onclick = () => selectCategory(val);

  chipsGrid.appendChild(newBtn);
  chipInput.value = '';
}

// Add Item to current active list
function addItem() {
  const name = itemNameInput.value.trim();
  const category = categoryInput.value.trim() || 'Uncategorized';

  if (!name) return;

  listsData[activeListName].push({ name, category });

  itemNameInput.value = '';
  categoryInput.value = '';

  renderList();
}

// Render active list items to DOM
function renderList() {
  const currentList = listsData[activeListName];
  activeCount.textContent = currentList.length;
  itemsList.innerHTML = '';

  currentList.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'list-item-row';
    li.innerHTML = `
      <div class="item-info">
        <span class="item-name">${item.name}</span>
        <span class="item-category">${item.category}</span>
      </div>
    `;
    itemsList.appendChild(li);
  });
}
