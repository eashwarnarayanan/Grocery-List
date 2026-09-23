// ==========================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
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

// Initialize Firebase & Database Reference
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==========================================
// 2. STATE MANAGEMENT & GLOBALS
// ==========================================
let currentItems = [];
let categoryMap = JSON.parse(localStorage.getItem("categoryMap")) || {
  milk: "Dairy",
  cheese: "Dairy",
  apple: "Produce",
  banana: "Produce",
  bread: "Bakery"
};

// History Stacks for Undo/Redo
let undoStack = [];
let redoStack = [];

// Track Session & Active Filter
let currentUser = localStorage.getItem("grocery_username") || "";
let activeFilter = "All";

// Witty Duplicate Alerts
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
const loginContainer = document.getElementById("loginContainer");
const appContainer = document.getElementById("appContainer");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const itemInput = document.getElementById("itemInput");
const categoryInput = document.getElementById("categoryInput");
const addItemBtn = document.getElementById("addItemBtn");
const groceryList = document.getElementById("groceryList");
const filterBar = document.querySelector(".filter-bar");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const shareBtn = document.getElementById("shareBtn");

// ==========================================
// 4. AUTHENTICATION & SESSION HANDLING
// ==========================================
function initApp() {
  if (currentUser) {
    loginContainer.style.display = "none";
    appContainer.style.display = "block";
    listenToFirebaseUpdates();
  } else {
    loginContainer.style.display = "block";
    appContainer.style.display = "none";
  }
}

loginBtn.addEventListener("click", () => {
  const user = usernameInput.value.trim();
  const pass = passwordInput.value.trim();

  // Strict Hardcoded Authentication
  if (user === "ASWATHY" && pass === "HARI") {
    currentUser = user;
    localStorage.setItem("grocery_username", currentUser);
    loginError.style.display = "none";
    usernameInput.value = "";
    passwordInput.value = "";
    initApp();
  } else {
    loginError.textContent = "Invalid username or password!";
    loginError.style.display = "block";
  }
});

logoutBtn.addEventListener("click", () => {
  if (currentUser) {
    const safeUser = currentUser.toLowerCase().trim().replace(/[.#$\[\]]/g, "_");
    database.ref("lists/" + safeUser).off(); // Stop listening
  }
  currentUser = "";
  localStorage.removeItem("grocery_username");
  initApp();
});

// ==========================================
// 5. FIREBASE CLOUD SYNCING
// ==========================================
function listenToFirebaseUpdates() {
  if (!currentUser) return;

  const safeUser = currentUser.toLowerCase().trim().replace(/[.#$\[\]]/g, "_");
  const listRef = database.ref("lists/" + safeUser);

  // Sync real-time updates across all logged-in devices
  listRef.on("value", (snapshot) => {
    const data = snapshot.val();
    currentItems = data && data.items ? data.items : [];
    renderList();
    renderCategoryFilters();
  });
}

function syncToFirebase(items) {
  if (!currentUser) return;

  const safeUser = currentUser.toLowerCase().trim().replace(/[.#$\[\]]/g, "_");
  database.ref("lists/" + safeUser).set({
    items: items,
    updatedAt: Date.now()
  });
}

function updateItemsAndSync(newItems) {
  undoStack.push(JSON.parse(JSON.stringify(currentItems)));
  redoStack = []; // Clear redo on new action
  currentItems = newItems;
  syncToFirebase(currentItems);
}

// ==========================================
// 6. ITEM MANAGEMENT & UNDO/REDO
// ==========================================
function addItem() {
  const name = itemInput.value.trim();
  if (!name) return;

  // Case-insensitive Duplicate Check
  const isDuplicate = currentItems.some(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );

  if (isDuplicate) {
    const randomMsg = WITTY_ALERTS[Math.floor(Math.random() * WITTY_ALERTS.length)];
    alert(randomMsg);
    return;
  }

  // Auto-Categorization & Learning
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
    category: category,
    completed: false
  };

  updateItemsAndSync([...currentItems, newItem]);

  itemInput.value = "";
  categoryInput.value = "";
}

function toggleItem(id) {
  const updated = currentItems.map((item) =>
    item.id === id ? { ...item, completed: !item.completed } : item
  );
  updateItemsAndSync(updated);
}

function removeItem(id) {
  const updated = currentItems.filter((item) => item.id !== id);
  updateItemsAndSync(updated);
}

// Undo / Redo Handlers
undoBtn.addEventListener("click", () => {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.parse(JSON.stringify(currentItems)));
  currentItems = undoStack.pop();
  syncToFirebase(currentItems);
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.parse(JSON.stringify(currentItems)));
  currentItems = redoStack.pop();
  syncToFirebase(currentItems);
});

// ==========================================
// 7. RENDERING LOGIC
// ==========================================
function renderList() {
  groceryList.innerHTML = "";

  const filteredItems = currentItems.filter((item) => {
    if (activeFilter === "All") return true;
    return item.category === activeFilter;
  });

  filteredItems.forEach((item) => {
    const li = document.createElement("li");
    li.className = `list-item ${item.completed ? "completed" : ""}`;

    li.innerHTML = `
      <span class="item-info">
        <strong>${escapeHtml(item.name)}</strong>
        <small class="category-tag">${escapeHtml(item.category)}</small>
      </span>
      <div class="item-actions">
        <button class="check-btn">${item.completed ? "↩️" : "✅"}</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

    li.querySelector(".check-btn").addEventListener("click", () => toggleItem(item.id));
    li.querySelector(".delete-btn").addEventListener("click", () => removeItem(item.id));

    groceryList.appendChild(li);
  });
}

function renderCategoryFilters() {
  const categories = ["All", ...new Set(currentItems.map((i) => i.category))];
  filterBar.innerHTML = "";

  categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = `filter-chip ${cat === activeFilter ? "active" : ""}`;
    chip.textContent = cat;
    chip.addEventListener("click", () => {
      activeFilter = cat;
      renderCategoryFilters();
      renderList();
    });
    filterBar.appendChild(chip);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[m]);
}

// ==========================================
// 8. SHARE & UTILITY EVENT LISTENERS
// ==========================================
addItemBtn.addEventListener("click", addItem);
itemInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addItem();
});

shareBtn.addEventListener("click", () => {
  const siteUrl = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(siteUrl)
      .then(() => alert("Site link copied! Share this link and sign in credentials with your friend to view the live list. 📋"))
      .catch(() => prompt("Copy your site link here:", siteUrl));
  } else {
    prompt("Copy your site link here:", siteUrl);
  }
});

// Initialize App Session on Page Load
initApp();
