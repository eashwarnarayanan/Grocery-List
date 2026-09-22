import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Public Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDemoKeyForGroceryListApp2026",
  authDomain: "freshbasket-app.firebaseapp.com",
  projectId: "freshbasket-app",
  storageBucket: "freshbasket-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:demo123456789"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get Session ID from URL or generate a new shared room ID
const urlParams = new URLSearchParams(window.location.search);
let listId = urlParams.get("list");
if (!listId) {
  listId = "family-" + Math.random().toString(36).substring(2, 8);
  window.history.replaceState({}, "", `?list=${listId}`);
}

const listDocRef = doc(db, "grocery_lists", listId);

// Added "🇮🇳 Indian Store" to default categories
const defaultCategories = [
  "🥦 Produce", "🧀 Dairy", "🍞 Bakery", "🥩 Meat & Seafood",
  "🍿 Snacks", "🥤 Drinks", "❄️ Frozen", "🧹 Household", "🥫 Pantry", "🇮🇳 Indian Store"
];

const autoCategoryMap = {
  "apple": "🥦 Produce", "apples": "🥦 Produce", "banana": "🥦 Produce", "bananas": "🥦 Produce",
  "orange": "🥦 Produce", "oranges": "🥦 Produce", "berry": "🥦 Produce", "berries": "🥦 Produce",
  "strawberry": "🥦 Produce", "blueberry": "🥦 Produce", "raspberry": "🥦 Produce",
  "lettuce": "🥦 Produce", "tomato": "🥦 Produce", "tomatoes": "🥦 Produce", "potato": "🥦 Produce",
  "potatoes": "🥦 Produce", "onion": "🥦 Produce", "onions": "🥦 Produce", "carrot": "🥦 Produce",
  "carrots": "🥦 Produce", "broccoli": "🥦 Produce", "spinach": "🥦 Produce", "avocado": "🥦 Produce",
  "cucumber": "🥦 Produce", "garlic": "🥦 Produce", "lemon": "🥦 Produce", "lime": "🥦 Produce",

  "milk": "🧀 Dairy", "cheese": "🧀 Dairy", "cheddar": "🧀 Dairy", "butter": "🧀 Dairy",
  "yogurt": "🧀 Dairy", "cream": "🧀 Dairy", "egg": "🧀 Dairy", "eggs": "🧀 Dairy",

  "bread": "🍞 Bakery", "bagel": "🍞 Bakery", "bagels": "🍞 Bakery", "croissant": "🍞 Bakery",
  "tortilla": "🍞 Bakery", "tortillas": "🍞 Bakery", "buns": "🍞 Bakery", "muffin": "🍞 Bakery",

  "chicken": "🥩 Meat & Seafood", "beef": "🥩 Meat & Seafood", "pork": "🥩 Meat & Seafood",
  "salmon": "🥩 Meat & Seafood", "fish": "🥩 Meat & Seafood", "steak": "🥩 Meat & Seafood",
  "bacon": "🥩 Meat & Seafood", "sausage": "🥩 Meat & Seafood", "shrimp": "🥩 Meat & Seafood",

  "chips": "🍿 Snacks", "popcorn": "🍿 Snacks", "nuts": "🍿 Snacks", "chocolate": "🍿 Snacks",
  "cookie": "🍿 Snacks", "cookies": "🍿 Snacks", "cracker": "🍿 Snacks", "candy": "🍿 Snacks",

  "water": "🥤 Drinks", "juice": "🥤 Drinks", "soda": "🥤 Drinks", "coffee": "🥤 Drinks",
  "tea": "🥤 Drinks", "cola": "🥤 Drinks", "beer": "🥤 Drinks", "wine": "🥤 Drinks",

  "ice cream": "❄️ Frozen", "pizza": "❄️ Frozen", "waffles": "❄️ Frozen", "frozen": "❄️ Frozen",

  "soap": "🧹 Household", "paper towel": "🧹 Household", "tissue": "🧹 Household",
  "detergent": "🧹 Household", "sponge": "🧹 Household", "cleaner": "🧹 Household",

  "rice": "🥫 Pantry", "pasta": "🥫 Pantry", "spaghetti": "🥫 Pantry", "sauce": "🥫 Pantry",
  "oil": "🥫 Pantry", "flour": "🥫 Pantry", "sugar": "🥫 Pantry", "salt": "🥫 Pantry"
};

const categorySuffixRules = [
  { suffix: "milk", category: "🧀 Dairy" },
  { suffix: "cheese", category: "🧀 Dairy" },
  { suffix: "yogurt", category: "🧀 Dairy" },
  { suffix: "juice", category: "🥤 Drinks" },
  { suffix: "sauce", category: "🥫 Pantry" },
  { suffix: "bread", category: "🍞 Bakery" },
  { suffix: "chips", category: "🍿 Snacks" }
];

let state = {
  categories: defaultCategories,
  groceryItems: [],
  removedItems: []
};

// UI Elements
const itemInput = document.getElementById("itemInput");
const categoryInput = document.getElementById("categoryInput");
const newCategoryInput = document.getElementById("newCategoryInput");
const createCategoryBtn = document.getElementById("createCategoryBtn");
const groceryListContainer = document.getElementById("groceryList");
const removedListContainer = document.getElementById("removedList");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

// Tab Navigation Elements
const navAddBtn = document.getElementById("navAddBtn");
const navListBtn = document.getElementById("navListBtn");
const navRemovedBtn = document.getElementById("navRemovedBtn");
const sectionAdd = document.getElementById("sectionAdd");
const sectionList = document.getElementById("sectionList");
const sectionRemoved = document.getElementById("sectionRemoved");

function switchTab(activeBtn, activeSection) {
  [navAddBtn, navListBtn, navRemovedBtn].forEach(btn => btn?.classList.remove("active"));
  [sectionAdd, sectionList, sectionRemoved].forEach(sec => sec?.classList.remove("active"));

  activeBtn?.classList.add("active");
  activeSection?.classList.add("active");
}

navAddBtn?.addEventListener("click", () => switchTab(navAddBtn, sectionAdd));
navListBtn?.addEventListener("click", () => switchTab(navListBtn, sectionList));
navRemovedBtn?.addEventListener("click", () => switchTab(navRemovedBtn, sectionRemoved));

// LIGHT / DARK MODE TOGGLE & AUTO SYSTEM DETECTION
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("fb_theme", theme);

  if (theme === "dark") {
    themeLabel.textContent = "Light";
    themeIcon.setAttribute("data-lucide", "sun");
  } else {
    themeLabel.textContent = "Dark";
    themeIcon.setAttribute("data-lucide", "moon");
  }
  if (window.lucide) lucide.createIcons();
}

function initTheme() {
  const savedTheme = localStorage.getItem("fb_theme");
  
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // Detect system device preference automatically
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
}

// Listen for system theme changes dynamically
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("fb_theme")) {
    applyTheme(e.matches ? "dark" : "light");
  }
});

themeToggleBtn?.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
});

// Share Button Logic
document.getElementById("shareListBtn")?.addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href);
  alert("🔗 Room link copied to clipboard! Share it with your friend so you can edit the list together in real time.");
});

// Sync data to Cloud Firestore
async function syncToCloud() {
  try {
    await setDoc(listDocRef, state, { merge: true });
  } catch (err) {
    console.warn("Firestore offline or sync delay:", err);
  }
}

// Real-Time Cloud Listener
onSnapshot(listDocRef, (docSnap) => {
  if (docSnap.exists()) {
    const data = docSnap.data();
    state.categories = data.categories || defaultCategories;
    
    // Ensure "🇮🇳 Indian Store" exists in saved categories
    if (!state.categories.includes("🇮🇳 Indian Store")) {
      state.categories.push("🇮🇳 Indian Store");
    }

    state.groceryItems = data.groceryItems || [];
    state.removedItems = data.removedItems || [];
  } else {
    syncToCloud();
  }
  renderAll();
});

// Auto-Categorization on typing
itemInput?.addEventListener("input", () => {
  const text = itemInput.value.toLowerCase().trim();
  if (!text) {
    categoryInput.value = "";
    return;
  }

  let detectedCategory = null;
  const words = text.split(" ");
  for (const word of words) {
    if (autoCategoryMap[word]) {
      detectedCategory = autoCategoryMap[word];
      break;
    }
  }

  if (!detectedCategory) {
    for (const [key, cat] of Object.entries(autoCategoryMap)) {
      if (text.includes(key)) {
        detectedCategory = cat;
        break;
      }
    }
  }

  if (!detectedCategory) {
    for (const rule of categorySuffixRules) {
      if (text.endsWith(rule.suffix)) {
        detectedCategory = rule.category;
        break;
      }
    }
  }

  if (detectedCategory) {
    categoryInput.value = detectedCategory;
  }
});

function formatTimeAgo(timestamp) {
  const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  const remMinutes = diffInMinutes % 60;
  if (diffInHours < 24) return `${diffInHours}hr ${remMinutes}m ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
}

function renderCategoryOptions() {
  const container = document.getElementById("existingCategories");
  if (!container) return;
  container.innerHTML = "";

  state.categories.forEach(cat => {
    const pill = document.createElement("span");
    pill.className = "category-pill";
    pill.textContent = cat;
    pill.addEventListener("click", () => {
      if (categoryInput) {
        categoryInput.value = cat;
        if (itemInput) itemInput.focus();
      }
    });
    container.appendChild(pill);
  });
}

function renderGroceryList() {
  if (!groceryListContainer) return;
  groceryListContainer.innerHTML = "";

  if (state.groceryItems.length === 0) {
    groceryListContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p style="font-size: 2.5rem; margin-bottom: 8px;">🛒</p>
        <p style="font-weight: 700; font-size: 1.1rem;">Your shopping list is empty!</p>
      </div>
    `;
    return;
  }

  const grouped = {};
  state.groceryItems.forEach(item => {
    const cat = item.category || "📦 Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.keys(grouped).forEach(cat => {
    const card = document.createElement("div");
    card.className = "category-group-card";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `<span>${cat}</span> <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${grouped[cat].length} item(s)</span>`;
    card.appendChild(header);

    const ul = document.createElement("ul");
    ul.className = "grocery-items-list";

    grouped[cat].forEach(item => {
      const li = document.createElement("li");
      li.className = `grocery-item-row ${item.checked ? "checked" : ""}`;

      const leftDiv = document.createElement("div");
      leftDiv.className = "item-left";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "item-checkbox";
      checkbox.checked = item.checked;

      checkbox.addEventListener("change", () => {
        item.checked = checkbox.checked;
        if (item.checked) {
          item.checkedAt = Date.now();
        } else {
          delete item.checkedAt;
        }
        syncToCloud();
      });

      const span = document.createElement("span");
      span.className = "item-text";
      span.textContent = item.name;

      leftDiv.appendChild(checkbox);
      leftDiv.appendChild(span);
      li.appendChild(leftDiv);

      if (item.checked && item.checkedAt) {
        const remainingSec = Math.max(0, 60 - Math.floor((Date.now() - item.checkedAt) / 1000));
        const timerSpan = document.createElement("span");
        timerSpan.className = "timer-tag";
        timerSpan.textContent = `⏱️ Removing in ${remainingSec}s`;
        li.appendChild(timerSpan);
      }

      ul.appendChild(li);
    });

    card.appendChild(ul);
    groceryListContainer.appendChild(card);
  });
}

function renderRemovedList() {
  if (!removedListContainer) return;
  removedListContainer.innerHTML = "";

  if (state.removedItems.length === 0) {
    removedListContainer.innerHTML = `
      <p style="text-align: center; color: var(--text-muted); font-size: 0.85rem; font-weight: 500; padding: 10px;">
        No removed items yet.
      </p>
    `;
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "removed-items-list";

  [...state.removedItems].reverse().forEach(item => {
    const li = document.createElement("li");
    li.className = "removed-item-row";

    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";
    leftDiv.innerHTML = `<span style="font-size:0.85rem;">✅</span> <span class="item-text" style="text-decoration: line-through; color: var(--text-muted);">${item.name}</span> <span style="font-size:0.75rem; color: var(--text-muted);">(${item.category})</span>`;

    const timeSpan = document.createElement("span");
    timeSpan.className = "time-ago-tag";
    timeSpan.textContent = formatTimeAgo(item.removedAt);

    li.appendChild(leftDiv);
    li.appendChild(timeSpan);
    ul.appendChild(li);
  });

  removedListContainer.appendChild(ul);
}

function renderAll() {
  renderCategoryOptions();
  renderGroceryList();
  renderRemovedList();
  if (window.lucide) lucide.createIcons();
}

// 1-second interval loop: handles 60s tick-off removal & timestamp refresh
setInterval(() => {
  const now = Date.now();
  let updated = false;

  state.groceryItems = state.groceryItems.filter(item => {
    if (item.checked && item.checkedAt && (now - item.checkedAt >= 60000)) {
      state.removedItems.push({
        id: item.id,
        name: item.name,
        category: item.category,
        removedAt: now
      });
      updated = true;
      return false;
    }
    return true;
  });

  if (updated) {
    syncToCloud();
  } else {
    renderGroceryList();
    renderRemovedList();
  }
}, 1000);

// Add item on Enter / Return keypress
function handleAddItem() {
  const name = itemInput.value.trim();
  const category = categoryInput.value.trim() || "📦 Other";

  if (!name) return;

  state.groceryItems.push({
    id: Date.now().toString(),
    name: name,
    category: category,
    checked: false
  });

  if (category && !state.categories.includes(category)) {
    state.categories.push(category);
  }

  itemInput.value = "";
  categoryInput.value = "";
  syncToCloud();
  switchTab(navListBtn, sectionList);
}

itemInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddItem();
  }
});

categoryInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleAddItem();
  }
});

createCategoryBtn?.addEventListener("click", () => {
  const newCat = newCategoryInput.value.trim();
  if (!newCat) return;

  if (!state.categories.includes(newCat)) {
    state.categories.push(newCat);
    syncToCloud();
  }

  newCategoryInput.value = "";
});

newCategoryInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    createCategoryBtn?.click();
  }
});

// Initialize app & theme
initTheme();
