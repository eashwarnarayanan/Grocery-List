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
let categoryMap = JSON.parse(localStorage.getItem("categoryMap")) || {
  milk: "Dairy",
  cheese: "Dairy",
  apple: "Produce",
  banana: "Produce",
  bread: "Bakery"
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

const itemInput = document.getElementById("item-input");
const categoryInput = document.getElementById("category-input");
const addBtn = document.getElementById("add-btn");
const groceryList = document.getElementById("grocery-list");
const categoryBar = document.getElementById("category-bar");

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
// 5. FIREBASE SYNCING
// ==========================================
function listenToFirebaseUpdates() {
  if (!currentUser) return;

  const safeUser = currentUser.toLowerCase().trim().replace(/[.#$\[\]]/g, "_");
  const listRef = database.ref("lists/" + safeUser);

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
  redoStack = [];
  currentItems = newItems;
  syncToFirebase(currentItems);
}

// ==========================================
// 6. ITEM MANAGEMENT & UNDO/REDO
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
    if (item.completed) li.classList.add("completed");

    const textSpan = document.createElement("span");
    textSpan.textContent = `${item.name} (${item.category})`;
    textSpan.addEventListener("click", () => toggleItem(item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "❌";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeItem(item.id);
    });

    li.appendChild(textSpan);
    li.appendChild(deleteBtn);
    groceryList.appendChild(li);
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

// ==========================================
// 8. EVENT LISTENERS & INITIALIZATION
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
