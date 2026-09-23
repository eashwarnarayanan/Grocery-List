// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC7H4Z4SHfPfaZXJdMeAKG9szDg2KUdBpo",
  authDomain: "grocery-list-5533e.firebaseapp.com",
  databaseURL: "https://grocery-list-5533e-default-rtdb.firebaseio.com",
  projectId: "grocery-list-5533e",
  storageBucket: "grocery-list-5533e.firebasestorage.app",
  messagingSenderId: "429534628995",
  appId: "1:429534628995:web:542e846166539d3f9edfb6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================
let currentItems = [];
let removedItems = [];
let categoryMap = JSON.parse(localStorage.getItem("categoryMap")) || {
  milk: "Dairy",
  cheese: "Dairy",
  apple: "Produce",
  apples: "Produce",
  banana: "Produce",
  bread: "Bakery",
  "puff pastry": "Bakery"
};

let undoStack = [];
let redoStack = [];
let currentUser = localStorage.getItem("grocery_username") || "";
let activeFilter = "All";

const WITTY_ALERTS = [
  "Hold your horses! That item is already on your list. 🐴",
  "Deja vu? You already added that item! 🌀",
  "Double trouble! That's already on your list. 👯",
  "Your memory is playing tricks—that item is already there! 🧠",
  "No need to double dip—item already present! 🍿"
];

// ==========================================
// 3. DOM ELEMENTS
// ==========================================
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app-container");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userDisplayName = document.getElementById("user-display-name");

const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeIcon = document.getElementById("theme-icon");
const themeText = document.getElementById("theme-text");

const tabActive = document.getElementById("tab-active");
const tabAdd = document.getElementById("tab-add");
const tabRemoved = document.getElementById("tab-removed");

const viewActiveList = document.getElementById("view-active-list");
const viewAddItem = document.getElementById("view-add-item");
const viewRemovedList = document.getElementById("view-removed-list");

const itemInput = document.getElementById("item-input");
const categoryInput = document.getElementById("category-input");
const addBtn = document.getElementById("add-btn");
const groceryList = document.getElementById("grocery-list");
const removedList = document.getElementById("removed-list");
const categoryBar = document.getElementById("category-bar");
const activeCount = document.getElementById("active-count");
const removedCount = document.getElementById("removed-count");

const quickCategoriesGrid = document.getElementById("quick-categories-grid");
const customChipInput = document.getElementById("custom-chip-input");
const addChipBtn = document.getElementById("add-chip-btn");

const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");
const shareBtn = document.getElementById("share-btn");

// ==========================================
// 4. AUTHENTICATION & SESSION
// ==========================================
function initApp() {
  if (currentUser) {
    loginContainer.style.display = "none";
    appContainer.style.display = "block";
    userDisplayName.textContent = currentUser.toUpperCase();
    listenToFirebaseUpdates();
  } else {
    loginContainer.style.display = "block";
    appContainer.style.display = "none";
  }
}

loginBtn.addEventListener("click", () => {
  const user = usernameInput.value.trim();
  const pass = passwordInput.value.trim();

  if (user === "ASWATHY" && pass === "HARI") {
    currentUser = user;
    localStorage.setItem("grocery_username", currentUser);
    usernameInput.value = "";
    passwordInput.value = "";
    initApp();
  } else {
    alert("Invalid username or password!");
  }
});

logoutBtn.addEventListener("click", () => {
  if (currentUser) {
    const safeUser = currentUser.toLowerCase().trim().replace(/[.#$\[\]]/g, "_");
    database.ref("lists/" + safeUser).off();
  }
  currentUser = "";
  localStorage.removeItem("grocery_username");
  initApp();
});

// ==========================================
// 5. TAB SWITCHING LOGIC (Fixes overlap issue)
// ==========================================
function switchTab(selectedTab) {
  tabActive.classList.remove("active");
  tabAdd.classList.remove("active");
  tabRemoved.classList.remove("active");

  viewActiveList.style.display = "none";
  viewAddItem.style.display = "none";
  viewRemovedList.style.display = "none";

  if (selectedTab === "active") {
    tabActive.classList.add("active");
    viewActiveList.style.display = "block";
  } else if (selectedTab === "add") {
    tabAdd.classList.add("active");
    viewAddItem.style.display = "block";
  } else if (selectedTab === "removed") {
    tabRemoved.classList.add("active");
    viewRemovedList.style.display = "block";
  }
}

tabActive.addEventListener("click", () => switchTab("active"));
tabAdd.addEventListener("click", () => switchTab("add"));
tabRemoved.addEventListener("click", () => switchTab("removed"));

// Theme Toggle
themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  document.body.classList.toggle("dark-theme");

  if (document.body.classList.contains("light-theme")) {
    themeIcon.textContent = "☀️";
    themeText.textContent = "Light";
  } else {
    themeIcon.textContent = "🌙";
    themeText.textContent = "Dark";
  }
});

// ==========================================
// 6. FIREBASE REAL-TIME SYNC
// ==========================================
function listenToFirebaseUpdates() {
  if (!currentUser) return;

  const safeUser = currentUser.toLowerCase().trim().replace(/[.#$\[\]]/g, "_");
  const listRef = database.ref("lists/" + safeUser);

  listRef.on("value", (snapshot) => {
    const data = snapshot.val();
    currentItems = data && data.items ? data.items : [];
    removedItems = data && data.removed ? data.removed : [];
    renderList();
    renderCategoryFilters();
  });
}

function syncToFirebase(items, removed) {
  if (!currentUser) return;

  const safeUser = currentUser.toLowerCase().trim().replace(/[.#$\[\]]/g, "_");
  database.ref("lists/" + safeUser).set({
    items: items,
    removed: removed,
    updatedAt: Date.now()
  });
}

function updateItemsAndSync(newItems, newRemoved = removedItems) {
  undoStack.push({
    items: JSON.parse(JSON.stringify(currentItems)),
    removed: JSON.parse(JSON.stringify(removedItems))
  });
  redoStack = [];
  currentItems = newItems;
  removedItems = newRemoved;
  syncToFirebase(currentItems, removedItems);
}

// ==========================================
// 7. ITEM & CHIP MANAGEMENT
// ==========================================
function addItem() {
  const name = itemInput.value.trim();
  if (!name) return;

  const isDuplicate = currentItems.some(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );

  if (isDuplicate) {
    const randomMsg = WITTY_ALERTS[Math.floor(Math.random() * WITTY_ALERTS.length)];
    alert(randomMsg);
    return;
  }

  const lowerName = name.toLowerCase();
  let category = categoryInput.value.trim();

  if (category) {
    categoryMap[lowerName] = category;
    localStorage.setItem("categoryMap", JSON.stringify(categoryMap));
  } else {
    category = categoryMap[lowerName] || "Uncategorized";
  }

  const newItem = {
    id: Date.now().toString(),
    name: name,
    category: category
  };

  updateItemsAndSync([...currentItems, newItem], removedItems);

  itemInput.value = "";
  categoryInput.value = "";

  // Switch back to Active List view after adding
  switchTab("active");
}

function removeItem(id) {
  const itemToRemove = currentItems.find((item) => item.id === id);
  if (!itemToRemove) return;

  const updatedActive = currentItems.filter((item) => item.id !== id);
  const updatedRemoved = [...removedItems, itemToRemove];

  updateItemsAndSync(updatedActive, updatedRemoved);
}

function restoreItem(id) {
  const itemToRestore = removedItems.find((item) => item.id === id);
  if (!itemToRestore) return;

  const updatedRemoved = removedItems.filter((item) => item.id !== id);
  const updatedActive = [...currentItems, itemToRestore];

  updateItemsAndSync(updatedActive, updatedRemoved);
}

// Quick select chips
quickCategoriesGrid.addEventListener("click", (e) => {
  if (e.target.classList.contains("chip-btn")) {
    const selectedCat = e.target.getAttribute("data-cat") || e.target.textContent;
    categoryInput.value = selectedCat;
  }
});

// Custom chip add
addChipBtn.addEventListener("click", () => {
  const newChipText = customChipInput.value.trim();
  if (!newChipText) return;

  const newBtn = document.createElement("button");
  newBtn.className = "chip-btn";
  newBtn.setAttribute("data-cat", newChipText);
  newBtn.textContent = newChipText;

  quickCategoriesGrid.appendChild(newBtn);
  customChipInput.value = "";
});

// Undo / Redo
undoBtn.addEventListener("click", () => {
  if (undoStack.length === 0) return;
  redoStack.push({
    items: JSON.parse(JSON.stringify(currentItems)),
    removed: JSON.parse(JSON.stringify(removedItems))
  });
  const previousState = undoStack.pop();
  currentItems = previousState.items;
  removedItems = previousState.removed;
  syncToFirebase(currentItems, removedItems);
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  undoStack.push({
    items: JSON.parse(JSON.stringify(currentItems)),
    removed: JSON.parse(JSON.stringify(removedItems))
  });
  const nextState = redoStack.pop();
  currentItems = nextState.items;
  removedItems = nextState.removed;
  syncToFirebase(currentItems, removedItems);
});

// ==========================================
// 8. RENDERING LOGIC
// ==========================================
function renderList() {
  groceryList.innerHTML = "";
  removedList.innerHTML = "";

  activeCount.textContent = currentItems.length;
  removedCount.textContent = removedItems.length;

  // Render Active Items
  const filteredItems = currentItems.filter((item) => {
    if (activeFilter === "All") return true;
    return item.category === activeFilter;
  });

  filteredItems.forEach((item) => {
    const li = document.createElement("li");

    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";

    const textSpan = document.createElement("span");
    textSpan.className = "item-text";
    textSpan.textContent = item.name;

    const catSpan = document.createElement("span");
    catSpan.className = "item-cat-tag";
    catSpan.textContent = item.category;

    leftDiv.appendChild(textSpan);
    leftDiv.appendChild(catSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✕";
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "Remove Item";
    deleteBtn.addEventListener("click", () => removeItem(item.id));

    li.appendChild(leftDiv);
    li.appendChild(deleteBtn);
    groceryList.appendChild(li);
  });

  // Render Removed Items
  removedItems.forEach((item) => {
    const li = document.createElement("li");

    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";

    const textSpan = document.createElement("span");
    textSpan.className = "item-text";
    textSpan.textContent = item.name;

    const catSpan = document.createElement("span");
    catSpan.className = "item-cat-tag";
    catSpan.textContent = item.category;

    leftDiv.appendChild(textSpan);
    leftDiv.appendChild(catSpan);

    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "↩ Restore";
    restoreBtn.className = "restore-btn";
    restoreBtn.addEventListener("click", () => restoreItem(item.id));

    li.appendChild(leftDiv);
    li.appendChild(restoreBtn);
    removedList.appendChild(li);
  });
}

function renderCategoryFilters() {
  const categories = ["All", ...new Set(currentItems.map((i) => i.category))];
  categoryBar.innerHTML = "";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `category-btn ${cat === activeFilter ? "active" : ""}`;
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeFilter = cat;
      renderCategoryFilters();
      renderList();
    });
    categoryBar.appendChild(btn);
  });
}

// Auto-fill category when typing
itemInput.addEventListener("input", () => {
  const val = itemInput.value.trim().toLowerCase();
  if (categoryMap[val]) {
    categoryInput.value = categoryMap[val];
  }
});

// ==========================================
// 9. EVENT LISTENERS & INITIALIZATION
// ==========================================
addBtn.addEventListener("click", addItem);
itemInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addItem();
});

shareBtn.addEventListener("click", () => {
  const siteUrl = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(siteUrl)
      .then(() => alert("Site link copied to clipboard! 📋"))
      .catch(() => prompt("Copy your site link here:", siteUrl));
  } else {
    prompt("Copy your site link here:", siteUrl);
  }
});

initApp();
