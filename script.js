document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  const defaultCategories = [
    "🥦 Produce", "🧀 Dairy", "🍞 Bakery", "🥩 Meat & Seafood",
    "🍿 Snacks", "🥤 Drinks", "❄️ Frozen", "🧹 Household", "🥫 Pantry", "🇮🇳 Indian Store"
  ];

  // Expanded dictionary for keyword matching
  const autoCategoryMap = {
    // Produce
    "apple": "🥦 Produce", "apples": "🥦 Produce", "banana": "🥦 Produce", "bananas": "🥦 Produce",
    "orange": "🥦 Produce", "oranges": "🥦 Produce", "berry": "🥦 Produce", "berries": "🥦 Produce",
    "strawberry": "🥦 Produce", "blueberry": "🥦 Produce", "raspberry": "🥦 Produce",
    "lettuce": "🥦 Produce", "tomato": "🥦 Produce", "tomatoes": "🥦 Produce", "potato": "🥦 Produce",
    "potatoes": "🥦 Produce", "onion": "🥦 Produce", "onions": "🥦 Produce", "carrot": "🥦 Produce",
    "carrots": "🥦 Produce", "broccoli": "🥦 Produce", "spinach": "🥦 Produce", "avocado": "🥦 Produce",
    "avocados": "🥦 Produce", "cucumber": "🥦 Produce", "garlic": "🥦 Produce", "lemon": "🥦 Produce",
    "lime": "🥦 Produce", "pepper": "🥦 Produce", "peppers": "🥦 Produce", "mushroom": "🥦 Produce",

    // Dairy
    "milk": "🧀 Dairy", "cheese": "🧀 Dairy", "cheddar": "🧀 Dairy", "mozzarella": "🧀 Dairy",
    "butter": "🧀 Dairy", "yogurt": "🧀 Dairy", "yoghurt": "🧀 Dairy", "cream": "🧀 Dairy",
    "egg": "🧀 Dairy", "eggs": "🧀 Dairy", "margarine": "🧀 Dairy", "gouda": "🧀 Dairy",

    // Bakery
    "bread": "🍞 Bakery", "bagel": "🍞 Bakery", "bagels": "🍞 Bakery", "croissant": "🍞 Bakery",
    "tortilla": "🍞 Bakery", "tortillas": "🍞 Bakery", "buns": "🍞 Bakery", "pita": "🍞 Bakery",
    "muffin": "🍞 Bakery", "toast": "🍞 Bakery", "donut": "🍞 Bakery",

    // Meat & Seafood
    "chicken": "🥩 Meat & Seafood", "beef": "🥩 Meat & Seafood", "pork": "🥩 Meat & Seafood",
    "salmon": "🥩 Meat & Seafood", "fish": "🥩 Meat & Seafood", "steak": "🥩 Meat & Seafood",
    "turkey": "🥩 Meat & Seafood", "bacon": "🥩 Meat & Seafood", "sausage": "🥩 Meat & Seafood",
    "shrimp": "🥩 Meat & Seafood", "tuna": "🥩 Meat & Seafood", "lamb": "🥩 Meat & Seafood",

    // Snacks
    "chips": "🍿 Snacks", "popcorn": "🍿 Snacks", "nuts": "🍿 Snacks", "chocolate": "🍿 Snacks",
    "cookie": "🍿 Snacks", "cookies": "🍿 Snacks", "cracker": "🍿 Snacks", "candy": "🍿 Snacks",
    "crisps": "🍿 Snacks", "doritos": "🍿 Snacks", "pringles": "🍿 Snacks",

    // Drinks
    "water": "🥤 Drinks", "juice": "🥤 Drinks", "soda": "🥤 Drinks", "coffee": "🥤 Drinks",
    "tea": "🥤 Drinks", "cola": "🥤 Drinks", "beer": "🥤 Drinks", "wine": "🥤 Drinks",
    "pepsi": "🥤 Drinks", "coke": "🥤 Drinks", "sprite": "🥤 Drinks",

    // Frozen
    "ice cream": "❄️ Frozen", "pizza": "❄️ Frozen", "waffles": "❄️ Frozen",
    "frozen": "❄️ Frozen", "nuggets": "❄️ Frozen",

    // Household
    "soap": "🧹 Household", "paper towel": "🧹 Household", "tissue": "🧹 Household",
    "detergent": "🧹 Household", "sponge": "🧹 Household", "cleaner": "🧹 Household",
    "shampoo": "🧹 Household", "toothpaste": "🧹 Household",

    // Pantry
    "rice": "🥫 Pantry", "pasta": "🥫 Pantry", "spaghetti": "🥫 Pantry", "sauce": "🥫 Pantry",
    "oil": "🥫 Pantry", "flour": "🥫 Pantry", "sugar": "🥫 Pantry", "salt": "🥫 Pantry",
    "soup": "🥫 Pantry", "cereal": "🥫 Pantry", "beans": "🥫 Pantry", "oats": "🥫 Pantry"
  };

  // Rule-based fallback system for words that end with common items
  const categorySuffixRules = [
    { suffix: "milk", category: "🧀 Dairy" },
    { suffix: "cheese", category: "🧀 Dairy" },
    { suffix: "yogurt", category: "🧀 Dairy" },
    { suffix: "juice", category: "🥤 Drinks" },
    { suffix: "tea", category: "🥤 Drinks" },
    { suffix: "water", category: "🥤 Drinks" },
    { suffix: "sauce", category: "🥫 Pantry" },
    { suffix: "bread", category: "🍞 Bakery" },
    { suffix: "oil", category: "🥫 Pantry" },
    { suffix: "chips", category: "🍿 Snacks" },
    { suffix: "steak", category: "🥩 Meat & Seafood" },
    { suffix: "fish", category: "🥩 Meat & Seafood" }
  ];

  let categories = JSON.parse(localStorage.getItem("fb_categories")) || defaultCategories;
  let groceryItems = JSON.parse(localStorage.getItem("fb_items")) || [];
  let removedItems = JSON.parse(localStorage.getItem("fb_removed_items")) || [];

  const itemInput = document.getElementById("itemInput");
  const categoryInput = document.getElementById("categoryInput");
  const addItemBtn = document.getElementById("addItemBtn");
  const newCategoryInput = document.getElementById("newCategoryInput");
  const createCategoryBtn = document.getElementById("createCategoryBtn");
  const groceryListContainer = document.getElementById("groceryList");
  const removedListContainer = document.getElementById("removedList");

  // Bottom Navigation tabs switching logic
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

  // Auto-Categorization logic on input
  itemInput?.addEventListener("input", () => {
    const text = itemInput.value.toLowerCase().trim();
    if (!text) {
      categoryInput.value = "";
      return;
    }

    // 1. Direct dictionary lookup / partial match
    let detectedCategory = null;
    const words = text.split(" ");
    for (const word of words) {
      if (autoCategoryMap[word]) {
        detectedCategory = autoCategoryMap[word];
        break;
      }
    }

    // 2. Full phrase match
    if (!detectedCategory) {
      for (const [key, cat] of Object.entries(autoCategoryMap)) {
        if (text.includes(key)) {
          detectedCategory = cat;
          break;
        }
      }
    }

    // 3. Suffix rule matching (e.g. "Almond milk" -> Milk -> Dairy)
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

  // Custom Dropdown Menu for Categories
  const dropdownMenu = document.createElement("div");
  dropdownMenu.className = "custom-dropdown-menu";
  dropdownMenu.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0;
    background: #ffffff; border: 1px solid #cbd5e1;
    border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    z-index: 1000; max-height: 180px; overflow-y: auto; display: none; margin-top: 6px;
  `;
  if (categoryInput && categoryInput.parentElement) {
    categoryInput.parentElement.style.position = "relative";
    categoryInput.parentElement.appendChild(dropdownMenu);
  }

  function saveData() {
    localStorage.setItem("fb_categories", JSON.stringify(categories));
    localStorage.setItem("fb_items", JSON.stringify(groceryItems));
    localStorage.setItem("fb_removed_items", JSON.stringify(removedItems));
  }

  function showSuggestions(filterText = "") {
    if (!dropdownMenu) return;
    dropdownMenu.innerHTML = "";
    const filtered = categories.filter(cat => cat.toLowerCase().includes(filterText.toLowerCase()));

    if (filtered.length === 0) {
      dropdownMenu.style.display = "none";
      return;
    }

    filtered.forEach(cat => {
      const item = document.createElement("div");
      item.textContent = cat;
      item.style.cssText = `padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.9rem; color: #334155; border-bottom: 1px solid #f1f5f9;`;
      item.addEventListener("mouseenter", () => item.style.background = "#e0e7ff");
      item.addEventListener("mouseleave", () => item.style.background = "#ffffff");
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (categoryInput) categoryInput.value = cat;
        dropdownMenu.style.display = "none";
      });
      dropdownMenu.appendChild(item);
    });

    dropdownMenu.style.display = "block";
  }

  categoryInput?.addEventListener("focus", () => showSuggestions(categoryInput.value));
  categoryInput?.addEventListener("input", () => showSuggestions(categoryInput.value));
  categoryInput?.addEventListener("blur", () => {
    setTimeout(() => { dropdownMenu.style.display = "none"; }, 150);
  });

  function renderCategoryOptions() {
    const existingCategoriesContainer = document.getElementById("existingCategories");
    if (existingCategoriesContainer) existingCategoriesContainer.innerHTML = "";

    categories.forEach(cat => {
      if (existingCategoriesContainer) {
        const pill = document.createElement("span");
        pill.className = "category-pill";
        pill.textContent = cat;
        pill.addEventListener("click", () => {
          if (categoryInput) {
            categoryInput.value = cat;
            if (itemInput) itemInput.focus();
          }
        });
        existingCategoriesContainer.appendChild(pill);
      }
    });
  }

  // Format Elapsed Time: Seconds -> Minutes -> 1hr 2mins -> Days
  function formatTimeAgo(timestamp) {
    const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);

    if (diffInSeconds < 60) {
      return `${Math.max(1, diffInSeconds)}s ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    const remMinutes = diffInMinutes % 60;
    if (diffInHours < 24) {
      return `${diffInHours}hr ${remMinutes}mins ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  function renderGroceryList() {
    if (!groceryListContainer) return;
    groceryListContainer.innerHTML = "";

    if (groceryItems.length === 0) {
      groceryListContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #94a3b8;">
          <p style="font-size: 2rem; margin-bottom: 6px;">🛒</p>
          <p style="font-weight: 600; font-size: 1rem;">Your shopping list is empty!</p>
        </div>
      `;
    } else {
      const grouped = {};
      groceryItems.forEach(item => {
        const cat = item.category || "📦 Other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });

      Object.keys(grouped).forEach(cat => {
        const card = document.createElement("div");
        card.className = "category-group-card";

        const header = document.createElement("div");
        header.className = "category-header";
        header.innerHTML = `<span>${cat}</span> <span style="font-size: 0.8rem; color: #64748b; font-weight: 600;">${grouped[cat].length} item(s)</span>`;
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
            saveData();
            renderGroceryList();
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

    renderRemovedList();
  }

  function renderRemovedList() {
    if (!removedListContainer) return;
    removedListContainer.innerHTML = "";

    if (removedItems.length === 0) {
      removedListContainer.innerHTML = `
        <p style="text-align: center; color: #94a3b8; font-size: 0.85rem; font-weight: 500; padding: 10px;">
          No removed items yet.
        </p>
      `;
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "removed-items-list";

    [...removedItems].reverse().forEach(item => {
      const li = document.createElement("li");
      li.className = "removed-item-row";

      const leftDiv = document.createElement("div");
      leftDiv.className = "item-left";
      leftDiv.innerHTML = `<span style="font-size:0.85rem;">✅</span> <span class="item-text" style="text-decoration: line-through; color: #94a3b8;">${item.name}</span> <span style="font-size:0.75rem; color:#94a3b8;">(${item.category})</span>`;

      const timeSpan = document.createElement("span");
      timeSpan.className = "time-ago-tag";
      timeSpan.textContent = formatTimeAgo(item.removedAt);

      li.appendChild(leftDiv);
      li.appendChild(timeSpan);
      ul.appendChild(li);
    });

    removedListContainer.appendChild(ul);
  }

  // 1-second interval loop: auto-removes items ticked over 60s and updates timestamps
  setInterval(() => {
    const now = Date.now();
    let updated = false;

    groceryItems = groceryItems.filter(item => {
      if (item.checked && item.checkedAt && (now - item.checkedAt >= 60000)) {
        removedItems.push({
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
      saveData();
    }

    renderGroceryList();
  }, 1000);

  addItemBtn?.addEventListener("click", () => {
    const name = itemInput.value.trim();
    const category = categoryInput.value.trim() || "📦 Other";

    if (!name) return;

    groceryItems.push({
      id: Date.now(),
      name: name,
      category: category,
      checked: false
    });

    if (category && !categories.includes(category)) {
      categories.push(category);
      renderCategoryOptions();
    }

    itemInput.value = "";
    categoryInput.value = "";
    saveData();
    renderGroceryList();

    switchTab(navListBtn, sectionList);
  });

  createCategoryBtn?.addEventListener("click", () => {
    const newCat = newCategoryInput.value.trim();
    if (!newCat) return;

    if (!categories.includes(newCat)) {
      categories.push(newCat);
      saveData();
      renderCategoryOptions();
    }

    newCategoryInput.value = "";
  });

  renderCategoryOptions();
  renderGroceryList();
});