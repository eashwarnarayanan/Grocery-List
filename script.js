// DEFAULT CATEGORY MAP
const categoryDictionary = {
  // Produce
  apple: "🥦 Produce",
  apples: "🥦 Produce",
  banana: "🥦 Produce",
  bananas: "🥦 Produce",
  orange: "🥦 Produce",
  oranges: "🥦 Produce",
  tomato: "🥦 Produce",
  tomatoes: "🥦 Produce",
  potato: "🥦 Produce",
  potatoes: "🥦 Produce",
  onion: "🥦 Produce",
  onions: "🥦 Produce",
  lettuce: "🥦 Produce",
  spinach: "🥦 Produce",
  avocado: "🥦 Produce",
  carrot: "🥦 Produce",

  // Dairy
  milk: "🧀 Dairy",
  cheese: "🧀 Dairy",
  butter: "🧀 Dairy",
  yogurt: "🧀 Dairy",
  cream: "🧀 Dairy",

  // Bakery
  bread: "🍞 Bakery",
  bagel: "🍞 Bakery",
  croissant: "🍞 Bakery",
  muffins: "🍞 Bakery",

  // Meat & Seafood
  chicken: "🥩 Meat & Seafood",
  beef: "🥩 Meat & Seafood",
  pork: "🥩 Meat & Seafood",
  steak: "🥩 Meat & Seafood",
  fish: "🥩 Meat & Seafood",
  salmon: "🥩 Meat & Seafood",
  shrimp: "🥩 Meat & Seafood",

  // Snacks
  chips: "🍿 Snacks",
  popcorn: "🍿 Snacks",
  chocolate: "🍿 Snacks",
  candy: "🍿 Snacks",
  cookies: "🍿 Snacks",
  crackers: "🍿 Snacks",
  nuts: "🍿 Snacks",

  // Drinks
  water: "🥤 Drinks",
  juice: "🥤 Drinks",
  soda: "🥤 Drinks",
  coffee: "🥤 Drinks",
  tea: "🥤 Drinks",
  coke: "🥤 Drinks",

  // Frozen
  icecream: "❄️ Frozen",
  pizza: "❄️ Frozen",
  fries: "❄️ Frozen",
  nuggets: "❄️ Frozen",

  // Household
  soap: "🧹 Household",
  detergent: "🧹 Household",
  "paper towel": "🧹 Household",
  "toilet paper": "🧹 Household",
  sponge: "🧹 Household",
  cleaner: "🧹 Household",

  // Pantry
  rice: "🥫 Pantry",
  pasta: "🥫 Pantry",
  cereal: "🥫 Pantry",
  flour: "🥫 Pantry",
  sugar: "🥫 Pantry",
  oil: "🥫 Pantry",
  sauce: "🥫 Pantry",

  // Indian Store
  paneer: "🇮🇳 Indian Store",
  atta: "🇮🇳 Indian Store",
  ghee: "🇮🇳 Indian Store",
  masala: "🇮🇳 Indian Store",
  dal: "🇮🇳 Indian Store",
  turmeric: "🇮🇳 Indian Store",
  cumin: "🇮🇳 Indian Store"
};

// LOAD LEARNED MAPPINGS FROM LOCAL STORAGE
let learnedCategories = JSON.parse(localStorage.getItem("learnedCategories")) || {};

// STATE MANAGEMENT
let currentUser = null;
let shoppingList = [];
let recentlyRemoved = [];

// UNDO / REDO HISTORY STACKS
let undoStack = [];
let redoStack = [];

// GLOBAL TICKER FOR COUNTDOWNS & RELATIVE TIMES
let globalInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  const authModal = document.getElementById("authModal");
  const authForm = document.getElementById("authForm");
  const appContainer = document.getElementById("appContainer");
  const userGreeting = document.getElementById("userGreeting");
  const signOutBtn = document.getElementById("signOutBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  const itemNameInput = document.getElementById("itemName");
  const itemCategoryInput = document.getElementById("itemCategory");
  const addItemForm = document.getElementById("addItemForm");
  const quickCatChips = document.getElementById("quickCatChips");
  const customCatInput = document.getElementById("customCatInput");
  const createCatBtn = document.getElementById("createCatBtn");

  const shoppingListContainer = document.getElementById("shoppingListContainer");
  const recentlyRemovedContainer = document.getElementById("recentlyRemovedContainer");
  const itemCountBadge = document.getElementById("itemCountBadge");

  // UNDO & REDO BUTTON REFS
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");

  // --- RECORD ACTION FOR UNDO/REDO ---
  function recordAction(action) {
    undoStack.push(action);
    redoStack = []; // Clear redo stack on new action
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  // --- UNDO & REDO CORE FUNCTIONS ---
  window.undo = () => {
    if (undoStack.length === 0) return;
    const action = undoStack.pop();

    if (action.type === "ADD") {
      shoppingList = shoppingList.filter((item) => item.id !== action.item.id);
    } else if (action.type === "REMOVE") {
      shoppingList.splice(action.index, 0, action.item);
      recentlyRemoved = recentlyRemoved.filter((item) => item.id !== action.item.id);
    }

    redoStack.push(action);
    updateUndoRedoButtons();
    renderLists();
  };

  window.redo = () => {
    if (redoStack.length === 0) return;
    const action = redoStack.pop();

    if (action.type === "ADD") {
      shoppingList.push(action.item);
    } else if (action.type === "REMOVE") {
      const index = shoppingList.findIndex((item) => item.id === action.item.id);
      if (index !== -1) {
        const [removed] = shoppingList.splice(index, 1);
        removed.removedAt = Date.now();
        recentlyRemoved.unshift(removed);
      }
    }

    undoStack.push(action);
    updateUndoRedoButtons();
    renderLists();
  };

  if (undoBtn) undoBtn.addEventListener("click", window.undo);
  if (redoBtn) redoBtn.addEventListener("click", window.redo);

  // KEYBOARD SHORTCUTS FOR UNDO / REDO
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) {
        window.redo();
      } else {
        window.undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      window.redo();
    }
  });

  // --- 1. AUTHENTICATION (STRICT LOGIN CHECK) ---
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("authUsername").value.trim();
      const passwordInput = document.getElementById("authPassword").value.trim();

      // VALIDATE EXACT CREDENTIALS
      if (usernameInput === "ASWATHY" && passwordInput === "HARI") {
        currentUser = usernameInput;
        userGreeting.textContent = `👤 ${currentUser}`;
        authModal.classList.add("hidden");
        appContainer.classList.remove("hidden");
      } else {
        alert("Invalid Username or Password! Please try again.");
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      currentUser = null;
      appContainer.classList.add("hidden");
      authModal.classList.remove("hidden");
      document.getElementById("authUsername").value = "";
      document.getElementById("authPassword").value = "";
    });
  }

  // --- 2. GLOBAL TICKER ---
  globalInterval = setInterval(() => {
    let stateChanged = false;

    for (let i = shoppingList.length - 1; i >= 0; i--) {
      const item = shoppingList[i];
      if (item.isRemoving) {
        item.timeLeft -= 1;
        stateChanged = true;

        if (item.timeLeft <= 0) {
          const [removed] = shoppingList.splice(i, 1);
          removed.removedAt = Date.now();
          recentlyRemoved.unshift(removed);
        }
      }
    }

    if (stateChanged || recentlyRemoved.length > 0) {
      renderLists();
    }
  }, 1000);

  // --- 3. RELATIVE TIME FORMATTER ---
  function getRelativeTime(timestamp) {
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
    if (secondsAgo < 10) return "Just now";
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  }

  // --- 4. SMART AUTO-CATEGORISATION ---
  if (itemNameInput) {
    itemNameInput.addEventListener("input", (e) => {
      const value = e.target.value.toLowerCase().trim();
      if (!value) return;

      let matchedCategory = "";

      // Check learned custom mappings first
      if (learnedCategories[value]) {
        matchedCategory = learnedCategories[value];
      } else {
        for (const key in learnedCategories) {
          if (value.includes(key)) {
            matchedCategory = learnedCategories[key];
            break;
          }
        }
      }

      // Fallback to default dictionary
      if (!matchedCategory) {
        for (const key in categoryDictionary) {
          if (value.includes(key)) {
            matchedCategory = categoryDictionary[key];
            break;
          }
        }
      }

      if (matchedCategory && itemCategoryInput) {
        itemCategoryInput.value = matchedCategory;
      }
    });
  }

  // --- 5. CATEGORY CHIPS & CUSTOM CREATION ---
  if (quickCatChips) {
    quickCatChips.addEventListener("click", (e) => {
      if (e.target.classList.contains("chip") && itemCategoryInput) {
        itemCategoryInput.value = e.target.dataset.cat;
      }
    });
  }

  if (createCatBtn) {
    createCatBtn.addEventListener("click", () => {
      const catName = customCatInput.value.trim();
      if (catName) {
        const newChip = document.createElement("button");
        newChip.type = "button";
        newChip.className = "chip";
        newChip.dataset.cat = catName;
        newChip.textContent = catName;
        if (quickCatChips) quickCatChips.appendChild(newChip);

        if (itemCategoryInput) itemCategoryInput.value = catName;
        customCatInput.value = "";
      }
    });
  }

  // --- 6. ADD ITEM FORM ---
  if (addItemForm) {
    addItemForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = itemNameInput.value.trim();
      const category = itemCategoryInput.value.trim() || "📦 General";

      if (name) {
        // Learn item -> category association
        const lowerName = name.toLowerCase();
        learnedCategories[lowerName] = category;
        localStorage.setItem("learnedCategories", JSON.stringify(learnedCategories));

        const newItem = {
          id: Date.now(),
          name: name,
          category: category,
          isRemoving: false,
          timeLeft: 60
        };

        shoppingList.push(newItem);
        recordAction({ type: "ADD", item: newItem });

        itemNameInput.value = "";
        itemCategoryInput.value = "";

        renderLists();
      }
    });
  }

  // --- 7. RENDER LISTS ---
  function renderLists() {
    if (itemCountBadge) {
      itemCountBadge.textContent = shoppingList.length;
    }

    if (shoppingListContainer) {
      if (shoppingList.length === 0) {
        shoppingListContainer.innerHTML = `<p class="empty-msg">Your shopping list is empty!</p>`;
      } else {
        const grouped = {};
        shoppingList.forEach((item) => {
          if (!grouped[item.category]) grouped[item.category] = [];
          grouped[item.category].push(item);
        });

        let html = "";
        for (const cat in grouped) {
          html += `
            <div class="category-group">
              <div class="category-header">
                <span>${cat}</span>
                <span style="font-size:0.8rem; opacity:0.7;">${grouped[cat].length} item(s)</span>
              </div>
              ${grouped[cat]
                .map((item) => {
                  return `
                    <div class="list-item ${item.isRemoving ? "item-checked" : ""}">
                      <div class="item-left">
                        <input type="checkbox" 
                          ${item.isRemoving ? "checked" : ""} 
                          onchange="window.toggleItemRemoval(${item.id})">
                        <span>${item.name}</span>
                      </div>
                      ${
                        item.isRemoving
                          ? `<span class="badge-removing">🎯 Removing in ${item.timeLeft}s</span>`
                          : `<button class="remove-btn" onclick="window.removeItemDirect(${item.id})">🗑️</button>`
                      }
                    </div>
                  `;
                })
                .join("")}
            </div>
          `;
        }
        shoppingListContainer.innerHTML = html;
      }
    }

    if (recentlyRemovedContainer) {
      if (recentlyRemoved.length === 0) {
        recentlyRemovedContainer.innerHTML = `<p class="empty-msg">No removed items yet.</p>`;
      } else {
        recentlyRemovedContainer.innerHTML = recentlyRemoved
          .map(
            (item) => `
          <div class="list-item">
            <div>
              <span style="text-decoration: line-through; opacity: 0.7;">${item.name} (${item.category})</span>
              <div class="bought-time">Bought ${getRelativeTime(item.removedAt)}</div>
            </div>
            <button class="pill-btn" onclick="window.restoreItem(${item.id})">Restore</button>
          </div>
        `
          )
          .join("");
      }
    }
  }

  // --- 8. ITEM ACTION HANDLERS ---
  window.toggleItemRemoval = (id) => {
    const item = shoppingList.find((i) => i.id === id);
    if (item) {
      item.isRemoving = !item.isRemoving;
      if (item.isRemoving) {
        item.timeLeft = 60;
      }
      renderLists();
    }
  };

  window.removeItemDirect = (id) => {
    const index = shoppingList.findIndex((i) => i.id === id);
    if (index !== -1) {
      const [removed] = shoppingList.splice(index, 1);
      removed.removedAt = Date.now();
      recentlyRemoved.unshift(removed);

      recordAction({ type: "REMOVE", item: removed, index: index });
      renderLists();
    }
  };

  window.restoreItem = (id) => {
    const index = recentlyRemoved.findIndex((item) => item.id === id);
    if (index !== -1) {
      const [restored] = recentlyRemoved.splice(index, 1);
      restored.isRemoving = false;
      restored.timeLeft = 60;
      shoppingList.push(restored);
      renderLists();
    }
  };

  // --- 9. TABS ---
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetTab) targetTab.classList.add("active");
    });
  });

  // --- 10. THEME TOGGLE & SHARE ---
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.body.removeAttribute("data-theme");
        themeToggleBtn.textContent = "☀️ Light";
      } else {
        document.body.setAttribute("data-theme", "dark");
        themeToggleBtn.textContent = "🌙 Dark";
      }
    });
  }

  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href);
      alert("Share link copied to clipboard!");
    });
  }
});
